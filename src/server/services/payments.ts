// Оплата разовых тренировок: проведённое занятие, которое не списано с абонемента, ждёт оплаты.
// Цена одна для всех клиентов (задаёт тренер). Абонементы оплачиваются отдельно (memberships.ts).
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertClientAccess, assertTrainer } from "../access";
import { AppError } from "../errors";
import { sessionPriceSchema } from "@/lib/validation";
import { plural } from "@/lib/time";
import { rub } from "@/lib/money";
import { notify } from "./notifications";

/** Проведена, не списана с абонемента и ещё не оплачена. */
const unpaidWhere = { status: "COMPLETED", paidAt: null, membershipEntry: { is: null } } satisfies Prisma.SessionWhereInput;

async function priceOf(trainerId: string) {
  const t = await prisma.trainerProfile.findUniqueOrThrow({ where: { id: trainerId }, select: { sessionPriceRub: true } });
  return t.sessionPriceRub;
}

export async function setSessionPrice(actor: Actor, input: unknown) {
  assertTrainer(actor);
  const { sessionPriceRub } = sessionPriceSchema.parse(input);
  await prisma.trainerProfile.update({ where: { id: actor.trainerId }, data: { sessionPriceRub } });
  return sessionPriceRub;
}

/** Неоплаченные разовые тренировки клиента и сумма к оплате (если цена задана). */
export async function clientBalance(actor: Actor, clientId: string) {
  await assertClientAccess(prisma, actor, clientId);
  const [sessions, price] = await Promise.all([
    prisma.session.findMany({ where: { clientId, ...unpaidWhere }, orderBy: { startsAt: "asc" }, select: { id: true, startsAt: true } }),
    priceOf(actor.trainerId),
  ]);
  return { sessions, count: sessions.length, price, total: price === null ? null : price * sessions.length };
}

/** Тренер: кто сколько должен за разовые тренировки. */
export async function listDebts(actor: Actor) {
  assertTrainer(actor);
  const [rows, price] = await Promise.all([
    prisma.session.groupBy({ by: ["clientId"], where: { trainerId: actor.trainerId, ...unpaidWhere }, _count: { _all: true }, _min: { startsAt: true } }),
    priceOf(actor.trainerId),
  ]);
  const clients = await prisma.clientProfile.findMany({ where: { id: { in: rows.map((r) => r.clientId) } }, select: { id: true, user: { select: { name: true } } } });
  const name = new Map(clients.map((c) => [c.id, c.user.name]));
  return rows
    .map((r) => ({ clientId: r.clientId, name: name.get(r.clientId) ?? "Клиент", count: r._count._all, since: r._min.startsAt!, total: price === null ? null : price * r._count._all }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
}

/** «Получил перевод»: все неоплаченные разовые тренировки клиента отмечаются оплаченными по текущей цене. */
export async function markSessionsPaid(actor: Actor, clientId: string, now: Date = new Date()) {
  assertTrainer(actor);
  await assertClientAccess(prisma, actor, clientId);
  const price = await priceOf(actor.trainerId);
  const unpaid = await prisma.session.findMany({ where: { clientId, ...unpaidWhere }, select: { id: true } });
  if (unpaid.length === 0) throw new AppError("CONFLICT", "Неоплаченных тренировок нет");
  // Повторное нажатие не отметит дважды: обновляем только ещё не оплаченные.
  const { count } = await prisma.session.updateMany({ where: { id: { in: unpaid.map((s) => s.id) }, paidAt: null }, data: { paidAt: now, paidRub: price } });
  const total = price === null ? null : price * count;
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: clientId }, select: { userId: true } });
  await notify([client.userId], {
    type: "membership",
    title: "Оплата получена, спасибо!",
    body: `${plural(count, ["тренировка", "тренировки", "тренировок"])}${total !== null ? ` — ${rub(total)}` : ""}`,
    url: "/client",
  });
  return { count, total };
}

/** Деньги за месяц: получено (абонементы + разовые) и ожидается (неоплаченные). */
export async function monthMoney(actor: Actor, monthStart: Date, monthEnd: Date) {
  assertTrainer(actor);
  const t = actor.trainerId;
  const [memberships, singles, unpaidCount, unpaidMemberships, price] = await Promise.all([
    prisma.membership.aggregate({ where: { client: { trainerId: t }, paidAt: { gte: monthStart, lt: monthEnd } }, _sum: { priceRub: true }, _count: { _all: true } }),
    prisma.session.aggregate({ where: { trainerId: t, paidAt: { gte: monthStart, lt: monthEnd }, paidRub: { not: null } }, _sum: { paidRub: true }, _count: { _all: true } }),
    prisma.session.count({ where: { trainerId: t, ...unpaidWhere } }),
    prisma.membership.aggregate({ where: { client: { trainerId: t }, paidAt: null, remainingSessions: { gt: 0 } }, _sum: { priceRub: true }, _count: { _all: true } }),
    priceOf(t),
  ]);
  return {
    received: (memberships._sum.priceRub ?? 0) + (singles._sum.paidRub ?? 0),
    receivedMemberships: memberships._count._all,
    receivedSingles: singles._count._all,
    expected: (unpaidMemberships._sum.priceRub ?? 0) + (price ?? 0) * unpaidCount,
    unpaidSingles: unpaidCount,
    unpaidMemberships: unpaidMemberships._count._all,
    price,
  };
}
