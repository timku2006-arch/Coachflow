import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertClientAccess } from "../access";
import { bestLift, isNewRecord, recordTitle, type Lift } from "@/lib/records";
import { notify } from "./notifications";

export type NewRecord = { exerciseId: string; exerciseName: string; lift: Lift; previous: Lift; title: string };

/**
 * Пересчитывает рекорды одной тренировки после сохранения результатов.
 * Сравнение — только с более ранними проведёнными тренировками клиента,
 * поэтому повторное сохранение и внесение «задним числом» работают корректно.
 * Возвращает рекорды, которых раньше не было (о них и уведомляем).
 */
export async function detectRecords(sessionId: string): Promise<NewRecord[]> {
  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { results: { include: { exercise: { select: { name: true } } } } },
  });
  if (!s || s.status !== "COMPLETED") return [];

  const before = await prisma.personalRecord.findMany({ where: { sessionId } });
  await prisma.personalRecord.deleteMany({ where: { sessionId } });

  const byExercise = new Map<string, { name: string; sets: Lift[] }>();
  for (const r of s.results) {
    const g = byExercise.get(r.exerciseId) ?? { name: r.exercise.name, sets: [] };
    g.sets.push({ weightKg: r.weightKg, reps: r.reps });
    byExercise.set(r.exerciseId, g);
  }

  const fresh: NewRecord[] = [];
  for (const [exerciseId, g] of byExercise) {
    const current = bestLift(g.sets);
    if (!current) continue;
    const earlier = await prisma.sessionResult.findMany({
      where: { exerciseId, session: { clientId: s.clientId, status: "COMPLETED", startsAt: { lt: s.startsAt }, id: { not: s.id } } },
      select: { weightKg: true, reps: true },
    });
    const previous = bestLift(earlier);
    if (!previous || !isNewRecord(current, previous)) continue;
    await prisma.personalRecord.create({
      data: {
        clientId: s.clientId,
        exerciseId,
        sessionId,
        weightKg: current.weightKg,
        reps: current.reps,
        previousWeightKg: previous.weightKg,
        previousReps: previous.reps,
        achievedAt: s.startsAt,
      },
    });
    const wasAlready = before.some((b) => b.exerciseId === exerciseId && b.weightKg === current.weightKg && b.reps === current.reps);
    if (!wasAlready) fresh.push({ exerciseId, exerciseName: g.name, lift: current, previous, title: recordTitle(g.name, current, previous) });
  }

  if (fresh.length) {
    const client = await prisma.clientProfile.findUnique({ where: { id: s.clientId }, select: { userId: true } });
    for (const r of fresh) {
      await notify([client?.userId], {
        type: "record",
        title: `🏆 ${r.title}`,
        body: `Прошлый лучший результат — ${r.previous.weightKg} кг × ${r.previous.reps}. Так держать!`,
        url: `/client/sessions/${sessionId}`,
      });
    }
  }
  return fresh;
}

/** Все рекорды клиента (новые сверху). Видят клиент и его тренер. */
export async function listRecords(actor: Actor, clientId: string, take = 50) {
  await assertClientAccess(prisma, actor, clientId);
  return prisma.personalRecord.findMany({
    where: { clientId },
    orderBy: { achievedAt: "desc" },
    take,
    include: { exercise: { select: { name: true } } },
  });
}
