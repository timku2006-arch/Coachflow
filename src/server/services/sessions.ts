import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertClientAccess, assertTrainer } from "../access";
import { AppError, notFound } from "../errors";
import { createSessionSchema, sessionResultsSchema, sessionTimeSchema, optionalText } from "@/lib/validation";
import { SESSION_DURATION_MIN, addMinutes, addMoscowDays, moscowLocalToDate } from "@/lib/time";
import { CLIENT_CHANGE_WINDOW_HOURS, clientCanChangeSession } from "@/lib/booking-rules";
import { canEnterResults, sessionPhase } from "@/lib/session-phase";
import { assertOwnExercises } from "./exercises";
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

// ---------------------------------------------------------------- создание
export async function createSession(actor: Actor, input: unknown, now: Date = new Date()) {
  const data = createSessionSchema.parse(input);
  let clientId: string;
  if (actor.role === "TRAINER") {
    if (!data.clientId) throw new AppError("VALIDATION", "Выберите клиента");
    await assertClientAccess(prisma, actor, data.clientId);
    clientId = data.clientId;
  } else {
    if (data.clientId && data.clientId !== actor.clientId) throw notFound("Клиент");
    clientId = actor.clientId;
  }
  const startsAt = moscowLocalToDate(data.date, data.time);
  const endsAt = addMinutes(startsAt, SESSION_DURATION_MIN);
  validateNewTime(actor, startsAt, now);

  return withOverlapGuard(() =>
    prisma.$transaction(async (tx) => {
      await assertSlotFree(tx, actor.trainerId, startsAt, endsAt);
      return tx.session.create({
        data: { trainerId: actor.trainerId, clientId, startsAt, endsAt, createdById: actor.userId },
      });
    }),
  );
}

// ---------------------------------------------------------------- перенос
export async function rescheduleSession(actor: Actor, sessionId: string, input: unknown, now: Date = new Date()) {
  const s = await loadSession(actor, sessionId);
  if (s.status !== "SCHEDULED") throw new AppError("CONFLICT", "Перенести можно только запланированное занятие");
  if (actor.role === "CLIENT" && !clientCanChangeSession(s.startsAt, now)) {
    throw new AppError("TOO_LATE", TOO_LATE_MESSAGE);
  }
  const data = sessionTimeSchema.parse(input);
  const startsAt = moscowLocalToDate(data.date, data.time);
  const endsAt = addMinutes(startsAt, SESSION_DURATION_MIN);
  validateNewTime(actor, startsAt, now);

  return withOverlapGuard(() =>
    prisma.$transaction(async (tx) => {
      await assertSlotFree(tx, s.trainerId, startsAt, endsAt, s.id);
      return tx.session.update({ where: { id: s.id }, data: { startsAt, endsAt } });
    }),
  );
}

// ---------------------------------------------------------------- отмена
export async function cancelSession(actor: Actor, sessionId: string, now: Date = new Date()) {
  const s = await loadSession(actor, sessionId);
  if (s.status !== "SCHEDULED") throw new AppError("CONFLICT", "Отменить можно только запланированное занятие");
  if (actor.role === "CLIENT" && !clientCanChangeSession(s.startsAt, now)) {
    throw new AppError("TOO_LATE", TOO_LATE_MESSAGE);
  }
  return prisma.session.update({
    where: { id: s.id },
    data: { status: "CANCELLED", cancelledAt: now, cancelledById: actor.userId },
  });
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
    include: { results: { include: { exercise: true }, orderBy: { setNumber: "asc" } } },
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
      s.status === "CANCELLED" ? "Занятие отменено" : "Результаты можно внести после начала занятия",
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
    prisma.session.update({ where: { id: s.id }, data: { status: "COMPLETED", notes: data.notes } }),
  ]);
}

/** Заметка тренера к тренировке (можно и до занятия — как план). */
export async function updateSessionNotes(actor: Actor, sessionId: string, input: unknown) {
  assertTrainer(actor);
  const s = await loadSession(actor, sessionId);
  const { notes } = z.object({ notes: optionalText(2000) }).parse(input);
  return prisma.session.update({ where: { id: s.id }, data: { notes } });
}
