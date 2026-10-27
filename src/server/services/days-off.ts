// Нерабочие дни тренера: постоянные выходные и периоды (больничный, отпуск).
import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertTrainer } from "../access";
import { AppError, notFound } from "../errors";
import { timeOffSchema, weeklyDaysOffSchema } from "@/lib/validation";
import { addMoscowDays, dateOnly, dateOnlyToString, formatDateTime, moscowDateString, moscowLocalToDate } from "@/lib/time";
import { cancelReasonText, dayOffLabel, dayOffReason, type DaysOff, type TimeOffReason } from "@/lib/days-off";
import { notify } from "./notifications";

/** Выходные и периоды тренера, пересекающиеся с [from, to] (даты YYYY-MM-DD). */
export async function getDaysOff(trainerId: string, from: string, to: string): Promise<DaysOff> {
  const [trainer, periods] = await Promise.all([
    prisma.trainerProfile.findUniqueOrThrow({ where: { id: trainerId }, select: { weeklyDaysOff: true } }),
    prisma.timeOff.findMany({
      where: { trainerId, startsOn: { lte: dateOnly(to) }, endsOn: { gte: dateOnly(from) } },
      orderBy: { startsOn: "asc" },
    }),
  ]);
  return {
    weekly: trainer.weeklyDaysOff,
    periods: periods.map((p) => ({ startsOn: dateOnlyToString(p.startsOn), endsOn: dateOnlyToString(p.endsOn), reason: p.reason as TimeOffReason })),
  };
}

/** Закрытые дни недели (для календаря): дата → подпись. */
export async function closedDaysInWeek(trainerId: string, weekStart: Date) {
  const from = moscowDateString(weekStart);
  const off = await getDaysOff(trainerId, from, moscowDateString(addMoscowDays(weekStart, 6)));
  const closed: Record<string, string> = {};
  for (let i = 0; i < 7; i++) {
    const day = moscowDateString(addMoscowDays(weekStart, i));
    const reason = dayOffReason(day, off);
    if (reason) closed[day] = dayOffLabel[reason];
  }
  return closed;
}

/** Клиент не может записаться или перенести занятие на нерабочий день. На тренера не действует. */
export async function assertDayOpen(actor: Actor, startsAt: Date) {
  if (actor.role !== "CLIENT") return;
  const day = moscowDateString(startsAt);
  const reason = dayOffReason(day, await getDaysOff(actor.trainerId, day, day));
  if (reason) {
    throw new AppError("CONFLICT", reason === "weekly" ? "В этот день у тренера выходной — выберите другой день" : "В эти дни тренер не работает — выберите другой день");
  }
}

export async function setWeeklyDaysOff(actor: Actor, days: unknown) {
  assertTrainer(actor);
  const weeklyDaysOff = weeklyDaysOffSchema.parse(days);
  await prisma.trainerProfile.update({ where: { id: actor.trainerId }, data: { weeklyDaysOff } });
  return weeklyDaysOff;
}

/** Ближайшие и текущие периоды, когда тренер не работает. */
export async function listTimeOff(actor: Actor, now: Date = new Date()) {
  assertTrainer(actor);
  return prisma.timeOff.findMany({
    where: { trainerId: actor.trainerId, endsOn: { gte: dateOnly(moscowDateString(now)) } },
    orderBy: { startsOn: "asc" },
  });
}

/**
 * «Не работаю в эти дни»: закрывает даты для записи, отменяет запланированные
 * занятия, которые ещё не начались, и предупреждает каждого клиента.
 */
export async function createTimeOff(actor: Actor, input: unknown, now: Date = new Date()) {
  assertTrainer(actor);
  const data = timeOffSchema.parse(input);
  if (data.endsOn < moscowDateString(now)) throw new AppError("VALIDATION", "Эти дни уже прошли");
  // занятия с начала первого дня (но не уже начавшиеся) до конца последнего дня, по Москве
  const from = new Date(Math.max(now.getTime(), moscowLocalToDate(data.startsOn, "00:00").getTime()));
  const to = addMoscowDays(moscowLocalToDate(data.endsOn, "00:00"), 1);

  const { period, cancelled } = await prisma.$transaction(async (tx) => {
    const period = await tx.timeOff.create({
      data: { trainerId: actor.trainerId, startsOn: dateOnly(data.startsOn), endsOn: dateOnly(data.endsOn), reason: data.reason },
    });
    const sessions = await tx.session.findMany({
      where: { trainerId: actor.trainerId, status: "SCHEDULED", startsAt: { gt: from, lt: to } },
      include: { client: { select: { userId: true } } },
      orderBy: { startsAt: "asc" },
    });
    await tx.session.updateMany({
      where: { id: { in: sessions.map((s) => s.id) } },
      data: { status: "CANCELLED", cancelledAt: now, cancelledById: actor.userId },
    });
    return { period, cancelled: sessions };
  });

  for (const s of cancelled) {
    await notify([s.client.userId], {
      type: "session_cancelled",
      title: "Тренировка отменена",
      body: `${formatDateTime(s.startsAt)}. ${cancelReasonText[data.reason]} — запишитесь, пожалуйста, на другой день.`,
      url: `/client/schedule`,
    });
  }
  return { period, cancelled: cancelled.length };
}

/** Убрать период (например, выздоровели раньше). Отменённые занятия не восстанавливаются. */
export async function deleteTimeOff(actor: Actor, id: string) {
  assertTrainer(actor);
  const p = await prisma.timeOff.findUnique({ where: { id } });
  if (!p || p.trainerId !== actor.trainerId) throw notFound("Период");
  await prisma.timeOff.delete({ where: { id } });
}
