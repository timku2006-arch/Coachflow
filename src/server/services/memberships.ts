import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertClientAccess, assertTrainer } from "../access";
import { AppError, notFound } from "../errors";
import { membershipAdjustSchema, membershipSchema } from "@/lib/validation";
import { dateOnly, dateOnlyToString, formatDate, moscowDateString } from "@/lib/time";
import { isExpiringSoon, isLow, pickForWriteOff, remainingText } from "@/lib/membership";
import { notify } from "./notifications";

const asPlain = <T extends { validFrom: Date; validUntil: Date }>(m: T) => ({
  ...m,
  validFrom: dateOnlyToString(m.validFrom),
  validUntil: dateOnlyToString(m.validUntil),
});

async function parties(clientId: string) {
  const c = await prisma.clientProfile.findUnique({
    where: { id: clientId },
    select: { userId: true, user: { select: { name: true } }, trainer: { select: { userId: true } } },
  });
  return { clientUserId: c?.userId, clientName: c?.user.name ?? "клиента", trainerUserId: c?.trainer.userId };
}

async function ownMembership(actor: Actor, id: string) {
  assertTrainer(actor);
  const m = await prisma.membership.findUnique({ where: { id } });
  if (!m) throw notFound("Абонемент");
  await assertClientAccess(prisma, actor, m.clientId);
  return m;
}

/** Тренер заводит абонемент. */
export async function createMembership(actor: Actor, clientId: string, input: unknown, now: Date = new Date()) {
  assertTrainer(actor);
  await assertClientAccess(prisma, actor, clientId);
  const d = membershipSchema.parse(input);
  return prisma.membership.create({
    data: {
      clientId,
      totalSessions: d.totalSessions,
      remainingSessions: d.totalSessions,
      validFrom: dateOnly(d.validFrom),
      validUntil: dateOnly(d.validUntil),
      paidAt: d.paid ? now : null,
      priceRub: d.priceRub,
      note: d.note,
      entries: { create: { delta: d.totalSessions, reason: "manual", note: "Абонемент оформлен", createdById: actor.userId } },
    },
  });
}

/**
 * Списывает одно занятие за проведённую тренировку. Безопасно вызывать повторно:
 * за одну тренировку списание бывает не больше одного раза (уникальный sessionId в журнале).
 */
export async function writeOffForSession(sessionId: string, now: Date = new Date()) {
  const s = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true, clientId: true, startsAt: true, status: true } });
  if (!s || s.status !== "COMPLETED") return null;
  if (await prisma.membershipEntry.findUnique({ where: { sessionId } })) return null;
  const date = moscowDateString(s.startsAt);
  const list = await prisma.membership.findMany({ where: { clientId: s.clientId, remainingSessions: { gt: 0 } } });
  const target = pickForWriteOff(list.map(asPlain), date);
  if (!target) return null;

  const updated = await prisma.$transaction(async (tx) => {
    const dec = await tx.membership.updateMany({ where: { id: target.id, remainingSessions: { gt: 0 } }, data: { remainingSessions: { decrement: 1 } } });
    if (dec.count !== 1) return null;
    await tx.membershipEntry.create({ data: { membershipId: target.id, sessionId, delta: -1, reason: "session" } });
    return tx.membership.findUniqueOrThrow({ where: { id: target.id } });
  }).catch((e) => {
    // одновременное повторное сохранение: запись в журнале уже есть — ничего не делаем
    if (String(e).includes("Unique constraint")) return null;
    throw e;
  });
  if (updated && isLow(updated.remainingSessions) && !updated.remindedLowAt) {
    await prisma.membership.update({ where: { id: updated.id }, data: { remindedLowAt: now } });
    const p = await parties(updated.clientId);
    const left = remainingText(updated.remainingSessions).toLowerCase();
    await notify([p.clientUserId], { type: "membership", title: `По абонементу ${left}`, body: "Пора продлить — скажите тренеру на тренировке.", url: "/client" });
    await notify([p.trainerUserId], { type: "membership", title: `Абонемент: ${p.clientName}`, body: `${remainingText(updated.remainingSessions)}. Предложите продление.`, url: `/trainer/clients/${updated.clientId}?tab=membership` });
  }
  return updated;
}

/** Ручная корректировка остатка (тренер). */
export async function adjustRemaining(actor: Actor, membershipId: string, input: unknown) {
  const m = await ownMembership(actor, membershipId);
  const d = membershipAdjustSchema.parse(input);
  const delta = d.remainingSessions - m.remainingSessions;
  if (delta === 0) return m;
  return prisma.membership.update({
    where: { id: m.id },
    data: {
      remainingSessions: d.remainingSessions,
      // если остаток снова больше порога — напомним ещё раз, когда он опять станет маленьким
      remindedLowAt: isLow(d.remainingSessions) ? m.remindedLowAt : null,
      entries: { create: { delta, reason: "manual", note: d.note ?? "Корректировка тренером", createdById: actor.userId } },
    },
  });
}

export async function markPaid(actor: Actor, membershipId: string, now: Date = new Date()) {
  const m = await ownMembership(actor, membershipId);
  if (m.paidAt) throw new AppError("CONFLICT", "Оплата уже отмечена");
  return prisma.membership.update({
    where: { id: m.id },
    data: { paidAt: now, entries: { create: { delta: 0, reason: "payment", note: "Оплата отмечена", createdById: actor.userId } } },
  });
}

export async function deleteMembership(actor: Actor, membershipId: string) {
  const m = await ownMembership(actor, membershipId);
  await prisma.membership.delete({ where: { id: m.id } });
  return m.clientId;
}

/** Текущий абонемент для показа клиенту: действующий сегодня, иначе последний. */
export async function currentMembership(actor: Actor, clientId: string, now: Date = new Date()) {
  await assertClientAccess(prisma, actor, clientId);
  const today = moscowDateString(now);
  const list = (await prisma.membership.findMany({ where: { clientId }, orderBy: { validUntil: "desc" } })).map(asPlain);
  const active = list.filter((m) => m.validFrom <= today && today <= m.validUntil && m.remainingSessions > 0).sort((a, b) => a.validUntil.localeCompare(b.validUntil))[0];
  return active ?? list[0] ?? null;
}

export async function listMemberships(actor: Actor, clientId: string) {
  await assertClientAccess(prisma, actor, clientId);
  const list = await prisma.membership.findMany({
    where: { clientId },
    orderBy: { validUntil: "desc" },
    include: { entries: { orderBy: { createdAt: "desc" }, take: 20, include: { session: { select: { startsAt: true } } } } },
  });
  return list.map(asPlain);
}

/** Ежедневная проверка: до конца абонемента ≤ 7 дней — напоминание клиенту и тренеру (один раз). */
export async function runMembershipReminders(now: Date = new Date()): Promise<number> {
  const today = moscowDateString(now);
  const candidates = await prisma.membership.findMany({ where: { remindedExpiryAt: null, remainingSessions: { gt: 0 }, validUntil: { gte: dateOnly(today) } } });
  let sent = 0;
  for (const raw of candidates) {
    const m = asPlain(raw);
    if (!isExpiringSoon(m.validUntil, today)) continue;
    const claimed = await prisma.membership.updateMany({ where: { id: m.id, remindedExpiryAt: null }, data: { remindedExpiryAt: now } });
    if (claimed.count !== 1) continue;
    const p = await parties(m.clientId);
    const until = formatDate(new Date(`${m.validUntil}T12:00:00Z`));
    await notify([p.clientUserId], { type: "membership", title: `Абонемент действует до ${until}`, body: `${remainingText(m.remainingSessions)}. Успейте их использовать или продлите.`, url: "/client" });
    await notify([p.trainerUserId], { type: "membership", title: `Абонемент: ${p.clientName}`, body: `Заканчивается ${until}, ${remainingText(m.remainingSessions).toLowerCase()}.`, url: `/trainer/clients/${m.clientId}?tab=membership` });
    sent++;
  }
  return sent;
}
