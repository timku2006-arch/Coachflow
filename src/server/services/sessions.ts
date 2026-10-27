import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertClientAccess, assertTrainer } from "../access";
import { AppError, notFound } from "../errors";
import { createSessionSchema, resultsDraftSchema, sessionResultsSchema, sessionTimeSchema, optionalText } from "@/lib/validation";
import { addMinutes, addMoscowDays, formatDateTime, moscowLocalToDate } from "@/lib/time";
import { CLIENT_CHANGE_WINDOW_HOURS, clientCanChangeSession } from "@/lib/booking-rules";
import { canEnterResults, sessionPhase } from "@/lib/session-phase";
import { assertOwnExercises } from "./exercises";
import { onResultsSaved, onSessionBooked, onSessionCancelled, onSessionRescheduled } from "./events";
import { REMINDER_DAY_MS, REMINDER_SOON_MS } from "./reminders";
import { afterSessionCompleted } from "./session-hooks";
import { notify } from "./notifications";
import { z } from "zod";

const MAX_RANGE_DAYS = 366;

const TOO_LATE_MESSAGE =
  `До начала занятия осталось ${CLIENT_CHANGE_WINDOW_HOURS} часа или меньше — ` +
  "перенести или отменить его можно только через тренера.";

const sessionInclude = {
  client: { include: { user: { select: { name: true } } } },
  trainer: { include: { user: { select: { name: true } } } },
} satisfies Prisma.SessionInclude;

/** Загружает запись и проверяет доступ: тренер — только свои, клиент — только свои. */
async function loadSession(actor: Actor, sessionId: string) {
  const s = await prisma.session.findUnique({ where: { id: sessionId }, include: sessionInclude });
  const allowed =
    s && (actor.role === "TRAINER" ? s.trainerId === actor.trainerId : s.clientId === actor.clientId);
  if (!s || !allowed) throw notFound("Запись");
  return s;
}

function isOverlapError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("Session_no_overlap") || msg.includes("23P01");
}

async function assertSlotFree(
  tx: Prisma.TransactionClient,
  trainerId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
) {
  const clash = await tx.session.findFirst({
    where: {
      trainerId,
      status: { not: "CANCELLED" },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (clash) throw new AppError("CONFLICT", "Это время уже занято другим занятием");
}

/** Проверки нового времени занятия в зависимости от роли. */
function validateNewTime(actor: Actor, startsAt: Date, now: Date) {
  if (Math.abs(startsAt.getTime() - now.getTime()) > MAX_RANGE_DAYS * 86_400_000) {
    throw new AppError("VALIDATION", "Дата слишком далеко от сегодняшней");
  }
  if (actor.role === "CLIENT" && !clientCanChangeSession(startsAt, now)) {
    throw new AppError(
      "TOO_LATE",
      `Записаться можно не позднее чем за ${CLIENT_CHANGE_WINDOW_HOURS} часа до начала занятия`,
    );
  }
}

async function withOverlapGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isOverlapError(e)) throw new AppError("CONFLICT", "Это время уже занято другим занятием");
    throw e;
  }
}

/** Если до занятия уже меньше окна напоминания — это напоминание не нужно (запись и так свежая). */
function reminderFlags(startsAt: Date, now: Date) {
  const left = startsAt.getTime() - now.getTime();
  return {
    reminderDaySentAt: left <= REMINDER_DAY_MS ? now : null,
    reminderSoonSentAt: left <= REMINDER_SOON_MS ? now : null,
  };
}

const sessionMinutes = (s: { startsAt: Date; endsAt: Date }) => Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60_000);

// ---------------------------------------------------------------- создание
export async function createSession(actor: Actor, input: unknown, now: Date = new Date()) {
  const data = createSessionSchema.parse(input);
  let clientId: string;
  // Длительность выбирает тренер; клиенту она подставляется из его профиля.
  if (actor.role === "CLIENT" && data.durationMin) throw new AppError("FORBIDDEN", "Длительность занятия задаёт тренер");
  if (actor.role === "TRAINER") {
    if (!data.clientId) throw new AppError("VALIDATION", "Выберите клиента");
    await assertClientAccess(prisma, actor, data.clientId);
    clientId = data.clientId;
  } else {
    if (data.clientId && data.clientId !== actor.clientId) throw notFound("Клиент");
    clientId = actor.clientId;
  }
  const startsAt = moscowLocalToDate(data.date, data.time);
  const duration =
    data.durationMin ??
    (await prisma.clientProfile.findUniqueOrThrow({ where: { id: clientId }, select: { sessionDurationMin: true } })).sessionDurationMin;
  const endsAt = addMinutes(startsAt, duration);
  validateNewTime(actor, startsAt, now);

  const created = await withOverlapGuard(() =>
    prisma.$transaction(async (tx) => {
      await assertSlotFree(tx, actor.trainerId, startsAt, endsAt);
      return tx.session.create({
        data: {
          trainerId: actor.trainerId,
          clientId,
          startsAt,
          endsAt,
          createdById: actor.userId,
          // клиент записался сам — значит, придёт; запись тренера ждёт подтверждения
          confirmedAt: actor.role === "CLIENT" ? now : null,
          ...reminderFlags(startsAt, now),
        },
      });
    }),
  );
  await onSessionBooked(actor, created);
  return created;
}

// ---------------------------------------------------------------- перенос
export async function rescheduleSession(actor: Actor, sessionId: string, input: unknown, now: Date = new Date()) {
  const s = await loadSession(actor, sessionId);
  if (s.status !== "SCHEDULED") throw new AppError("CONFLICT", "Перенести можно только запланированное занятие");
  if (actor.role === "CLIENT" && !clientCanChangeSession(s.startsAt, now)) {
    throw new AppError("TOO_LATE", TOO_LATE_MESSAGE);
  }
  const data = sessionTimeSchema.parse(input);
  if (actor.role === "CLIENT" && data.durationMin) throw new AppError("FORBIDDEN", "Длительность занятия задаёт тренер");
  const startsAt = moscowLocalToDate(data.date, data.time);
  // При переносе длительность сохраняется, если тренер не выбрал другую
  const endsAt = addMinutes(startsAt, data.durationMin ?? sessionMinutes(s));
  validateNewTime(actor, startsAt, now);

  const updated = await withOverlapGuard(() =>
    prisma.$transaction(async (tx) => {
      await assertSlotFree(tx, s.trainerId, startsAt, endsAt, s.id);
      return tx.session.update({
        where: { id: s.id },
        data: { startsAt, endsAt, confirmedAt: actor.role === "CLIENT" ? now : null, ...reminderFlags(startsAt, now) },
      });
    }),
  );
  await onSessionRescheduled(actor, s, updated);
  return updated;
}

// ---------------------------------------------------------------- отмена
export async function cancelSession(actor: Actor, sessionId: string, now: Date = new Date()) {
  const s = await loadSession(actor, sessionId);
  if (s.status !== "SCHEDULED") throw new AppError("CONFLICT", "Отменить можно только запланированное занятие");
  if (actor.role === "CLIENT" && !clientCanChangeSession(s.startsAt, now)) {
    throw new AppError("TOO_LATE", TOO_LATE_MESSAGE);
  }
  const cancelled = await prisma.session.update({
    where: { id: s.id },
    data: { status: "CANCELLED", cancelledAt: now, cancelledById: actor.userId },
  });
  await onSessionCancelled(actor, cancelled);
  return cancelled;
}

// ---------------------------------------------------------------- чтение
export async function getSession(actor: Actor, sessionId: string, now: Date = new Date()) {
  const s = await loadSession(actor, sessionId);
  const results = await prisma.sessionResult.findMany({
    where: { sessionId: s.id },
    include: { exercise: true },
    orderBy: [{ id: "asc" }],
  });
  return {
    ...s,
    // Заметка тренера по тренировке видна и клиенту — это часть «что было сделано».
    results: results.sort((a, b) => a.setNumber - b.setNumber || 0),
    phase: sessionPhase(s, now),
    clientCanChange: s.status === "SCHEDULED" && clientCanChangeSession(s.startsAt, now),
  };
}

/** Записи на неделю. Клиент видит свои записи и анонимные «занято» для остальных. */
export async function listWeek(actor: Actor, weekStart: Date) {
  const weekEnd = addMoscowDays(weekStart, 7);
  const range = { startsAt: { lt: weekEnd }, endsAt: { gt: weekStart } };
  const sessions = await prisma.session.findMany({
    where: {
      trainerId: actor.trainerId,
      ...range,
      ...(actor.role === "CLIENT" ? { clientId: actor.clientId } : {}),
    },
    include: { client: { include: { user: { select: { name: true } } } } },
    orderBy: { startsAt: "asc" },
  });
  const busy =
    actor.role === "CLIENT"
      ? await prisma.session.findMany({
          where: { trainerId: actor.trainerId, clientId: { not: actor.clientId }, status: { not: "CANCELLED" }, ...range },
          select: { startsAt: true, endsAt: true },
          orderBy: { startsAt: "asc" },
        })
      : [];
  return { sessions, busy };
}

export async function listUpcoming(actor: Actor, clientId: string, now: Date = new Date(), take = 10) {
  await assertClientAccess(prisma, actor, clientId);
  return prisma.session.findMany({
    where: { clientId, status: "SCHEDULED", endsAt: { gt: now } },
    orderBy: { startsAt: "asc" },
    take,
  });
}

/** История: прошедшие занятия (проведённые и ожидающие результатов) с подходами. */
export async function listHistory(actor: Actor, clientId: string, now: Date = new Date()) {
  await assertClientAccess(prisma, actor, clientId);
  return prisma.session.findMany({
    where: { clientId, status: { not: "CANCELLED" }, startsAt: { lte: now } },
    orderBy: { startsAt: "desc" },
    include: { results: { include: { exercise: true }, orderBy: [{ setNumber: "asc" }, { id: "asc" }] } },
  });
}

/** Для тренера: прошедшие занятия без внесённых результатов. */
export async function listAwaitingResults(actor: Actor, now: Date = new Date()) {
  assertTrainer(actor);
  return prisma.session.findMany({
    where: { trainerId: actor.trainerId, status: "SCHEDULED", startsAt: { lte: now } },
    orderBy: { startsAt: "desc" },
    include: { client: { include: { user: { select: { name: true } } } } },
  });
}

// ---------------------------------------------------------------- результаты
export async function saveSessionResults(actor: Actor, sessionId: string, input: unknown, now: Date = new Date()) {
  assertTrainer(actor);
  const s = await loadSession(actor, sessionId);
  if (!canEnterResults(s, now)) {
    throw new AppError(
      "CONFLICT",
      s.status === "CANCELLED" ? "Занятие отменено" : "Результаты можно вносить за 15 минут до начала и позже",
    );
  }
  const data = sessionResultsSchema.parse(input);
  await assertOwnExercises(actor.trainerId, data.sets.map((x) => x.exerciseId));

  // Номер подхода считается внутри каждого упражнения в порядке ввода.
  const counters = new Map<string, number>();
  const rows = data.sets.map((set) => {
    const n = (counters.get(set.exerciseId) ?? 0) + 1;
    counters.set(set.exerciseId, n);
    return { sessionId: s.id, exerciseId: set.exerciseId, weightKg: set.weightKg, reps: set.reps, setNumber: n };
  });

  await prisma.$transaction([
    prisma.sessionResult.deleteMany({ where: { sessionId: s.id } }),
    prisma.sessionResult.createMany({ data: rows }),
    prisma.session.update({ where: { id: s.id }, data: { status: "COMPLETED", notes: data.notes, resultsDraft: Prisma.DbNull } }),
  ]);
  if (rows.length > 0) await onResultsSaved(s, s.status !== "COMPLETED", rows);
  return afterSessionCompleted(s.id);
}

/**
 * Черновик результатов во время тренировки. Сохраняется как есть (поля могут быть пустыми),
 * ничего не завершает и никого не уведомляет. Более старая версия не затирает более новую.
 */
export async function saveResultsDraft(actor: Actor, sessionId: string, input: unknown, now: Date = new Date()) {
  assertTrainer(actor);
  const s = await loadSession(actor, sessionId);
  if (s.status !== "SCHEDULED") throw new AppError("CONFLICT", "Тренировка уже завершена");
  if (!canEnterResults(s, now)) throw new AppError("CONFLICT", "Тренировка ещё не началась");
  const draft = resultsDraftSchema.parse(input);
  await assertOwnExercises(actor.trainerId, [...new Set(draft.sets.map((x) => x.exerciseId))]);
  const prev = resultsDraftSchema.safeParse(s.resultsDraft);
  if (prev.success && prev.data.savedAt > draft.savedAt) return prev.data;
  await prisma.session.update({ where: { id: s.id }, data: { resultsDraft: draft } });
  return draft;
}

/** Заметка тренера к тренировке (можно и до занятия — как план). */
export async function updateSessionNotes(actor: Actor, sessionId: string, input: unknown) {
  assertTrainer(actor);
  const s = await loadSession(actor, sessionId);
  const { notes } = z.object({ notes: optionalText(2000) }).parse(input);
  return prisma.session.update({ where: { id: s.id }, data: { notes } });
}

// ---------------------------------------------------------------- явка
/** Клиент нажал «Приду». Повторное нажатие ничего не меняет. */
export async function confirmAttendance(actor: Actor, sessionId: string, now: Date = new Date()) {
  if (actor.role !== "CLIENT") throw new AppError("FORBIDDEN", "Подтверждает явку клиент");
  const s = await loadSession(actor, sessionId);
  if (s.status !== "SCHEDULED") throw new AppError("CONFLICT", "Эта запись уже неактуальна");
  if (s.startsAt <= now) throw new AppError("CONFLICT", "Тренировка уже началась");
  if (s.confirmedAt) return s;
  const updated = await prisma.session.update({ where: { id: s.id }, data: { confirmedAt: now } });
  await notify([s.trainer.userId], {
    type: "attendance",
    title: `${s.client.user.name} придёт`,
    body: `${formatDateTime(s.startsAt)}`,
    url: `/trainer/sessions/${s.id}`,
    collapse: true,
  });
  return updated;
}

/** Тренер отмечает неявку: занятие прошло, клиента не было. */
export async function markMissed(actor: Actor, sessionId: string, now: Date = new Date()) {
  assertTrainer(actor);
  const s = await loadSession(actor, sessionId);
  if (s.status !== "SCHEDULED") throw new AppError("CONFLICT", "Отметить неявку можно только у запланированного занятия");
  if (s.startsAt > now) throw new AppError("CONFLICT", "Занятие ещё не началось");
  return prisma.session.update({ where: { id: s.id }, data: { status: "MISSED" } });
}
