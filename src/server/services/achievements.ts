import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertClientAccess } from "../access";
import { ACHIEVEMENTS, countPerfectWeeks, earnedCodes, type AchievementRule, type AchievementStats } from "@/lib/achievements";
import { moscowDateString, moscowWeekStart } from "@/lib/time";
import { notify } from "./notifications";

/** Статистика клиента для правил значков. */
export async function computeStats(clientId: string, now: Date = new Date()): Promise<AchievementStats> {
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: clientId }, select: { createdAt: true, userId: true } });
  const [completedSessions, records, sessions] = await Promise.all([
    prisma.session.count({ where: { clientId, status: "COMPLETED" } }),
    prisma.personalRecord.count({ where: { clientId } }),
    prisma.session.findMany({ where: { clientId, startsAt: { lt: now } }, select: { startsAt: true, status: true, cancelledById: true } }),
  ]);
  const firstSession = sessions.reduce<Date | null>((min, s) => (!min || s.startsAt < min ? s.startsAt : min), null);
  const since = firstSession && firstSession < client.createdAt ? firstSession : client.createdAt;
  const perfectWeeks = countPerfectWeeks(
    sessions.map((s) => ({
      weekKey: moscowDateString(moscowWeekStart(s.startsAt)),
      status: s.status,
      skippedByClient: s.status === "MISSED" || (s.status === "CANCELLED" && s.cancelledById === client.userId),
    })),
    moscowDateString(moscowWeekStart(now)),
  );
  return { completedSessions, records, perfectWeeks, daysWithTrainer: Math.floor((now.getTime() - since.getTime()) / 86_400_000) };
}

/** Выдаёт недостающие значки и сообщает о них клиенту. Повторный вызов ничего не дублирует. */
export async function evaluateAchievements(clientId: string, now: Date = new Date()): Promise<AchievementRule[]> {
  const stats = await computeStats(clientId, now);
  const due = earnedCodes(stats);
  const have = new Set((await prisma.clientAchievement.findMany({ where: { clientId }, select: { code: true } })).map((a) => a.code));
  const fresh = due.filter((c) => !have.has(c));
  if (!fresh.length) return [];
  await prisma.clientAchievement.createMany({ data: fresh.map((code) => ({ clientId, code, earnedAt: now })), skipDuplicates: true });
  const rules = ACHIEVEMENTS.filter((r) => fresh.includes(r.code));
  const client = await prisma.clientProfile.findUnique({ where: { id: clientId }, select: { userId: true } });
  for (const r of rules) {
    await notify([client?.userId], { type: "achievement", title: `Новый значок: «${r.title}»`, body: r.description, url: "/client/achievements" });
  }
  return rules;
}

export type BadgeView = { code: string; title: string; description: string; icon: AchievementRule["icon"]; color: AchievementRule["color"]; earnedAt: Date | null; progress: { value: number; target: number } | null };

/** Все значки: полученные (с датой) и ещё не полученные (с прогрессом). */
export async function listAchievements(actor: Actor, clientId: string, now: Date = new Date()): Promise<BadgeView[]> {
  await assertClientAccess(prisma, actor, clientId);
  const [earned, stats] = await Promise.all([prisma.clientAchievement.findMany({ where: { clientId } }), computeStats(clientId, now)]);
  const at = new Map(earned.map((e) => [e.code, e.earnedAt]));
  return ACHIEVEMENTS.map((r) => ({
    code: r.code,
    title: r.title,
    description: r.description,
    icon: r.icon,
    color: r.color,
    earnedAt: at.get(r.code) ?? null,
    progress: r.progress ? r.progress(stats) : null,
  }));
}
