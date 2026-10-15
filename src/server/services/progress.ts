import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertClientAccess } from "../access";

export type ExercisePoint = { date: string; maxWeightKg: number; repsAtMax: number; volumeKg: number };
export type ExerciseSeries = { exerciseId: string; name: string; points: ExercisePoint[] };

/**
 * Динамика рабочих весов: по каждому упражнению — для каждой проведённой тренировки
 * максимальный рабочий вес (и повторения в этом подходе) и общий тоннаж.
 */
export async function exerciseProgress(actor: Actor, clientId: string): Promise<ExerciseSeries[]> {
  await assertClientAccess(prisma, actor, clientId);
  const rows = await prisma.sessionResult.findMany({
    where: { session: { clientId, status: "COMPLETED" } },
    include: { exercise: { select: { name: true } }, session: { select: { id: true, startsAt: true } } },
    orderBy: { session: { startsAt: "asc" } },
  });

  const series = new Map<string, ExerciseSeries & { bySession: Map<string, ExercisePoint> }>();
  for (const r of rows) {
    let s = series.get(r.exerciseId);
    if (!s) {
      s = { exerciseId: r.exerciseId, name: r.exercise.name, points: [], bySession: new Map() };
      series.set(r.exerciseId, s);
    }
    let p = s.bySession.get(r.session.id);
    if (!p) {
      p = { date: r.session.startsAt.toISOString(), maxWeightKg: r.weightKg, repsAtMax: r.reps, volumeKg: 0 };
      s.bySession.set(r.session.id, p);
      s.points.push(p);
    }
    if (r.weightKg > p.maxWeightKg || (r.weightKg === p.maxWeightKg && r.reps > p.repsAtMax)) {
      p.maxWeightKg = r.weightKg;
      p.repsAtMax = r.reps;
    }
    p.volumeKg += r.weightKg * r.reps;
  }
  return [...series.values()]
    .map(({ exerciseId, name, points }) => ({ exerciseId, name, points }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}
