import { startOfMonth } from "date-fns";
import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertClientAccess } from "../access";
import { bestLift } from "@/lib/records";
import { summaryText, type PeriodKind, type Summary } from "@/lib/summary";
import { dateOnly, moscowDateString, moscowWeekStart, toMoscow } from "@/lib/time";

const MEASURES = [
  { key: "waistCm", label: "Талия", unit: "см" },
  { key: "hipsCm", label: "Бёдра", unit: "см" },
  { key: "chestCm", label: "Грудь", unit: "см" },
  { key: "armCm", label: "Руки", unit: "см" },
] as const;

export function periodStart(kind: PeriodKind, now: Date): Date {
  return kind === "week" ? moscowWeekStart(now) : new Date(startOfMonth(toMoscow(now)).getTime());
}

/** Сводка за текущую неделю или месяц (по Москве). */
export async function buildSummary(actor: Actor, clientId: string, kind: PeriodKind, now: Date = new Date()): Promise<Summary & { text: ReturnType<typeof summaryText> }> {
  await assertClientAccess(prisma, actor, clientId);
  const from = periodStart(kind, now);
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: clientId }, select: { userId: true } });
  const inPeriod = { gte: from, lte: now };

  const [completed, missed, clientCancelled, records, results, weights, measurements] = await Promise.all([
    prisma.session.count({ where: { clientId, status: "COMPLETED", startsAt: inPeriod } }),
    prisma.session.count({ where: { clientId, status: "MISSED", startsAt: inPeriod } }),
    prisma.session.count({ where: { clientId, status: "CANCELLED", cancelledById: client.userId, startsAt: inPeriod } }),
    prisma.personalRecord.findMany({ where: { clientId, achievedAt: inPeriod }, orderBy: { weightKg: "desc" }, include: { exercise: { select: { name: true } } } }),
    prisma.sessionResult.findMany({
      where: { session: { clientId, status: "COMPLETED", startsAt: { lte: now } } },
      select: { exerciseId: true, weightKg: true, reps: true, exercise: { select: { name: true } }, session: { select: { id: true, startsAt: true } } },
    }),
    prisma.bodyWeightEntry.findMany({ where: { clientId, date: { lte: dateOnly(moscowDateString(now)) } }, orderBy: { date: "asc" } }),
    prisma.bodyMeasurement.findMany({ where: { clientId, date: { lte: dateOnly(moscowDateString(now)) } }, orderBy: { date: "asc" } }),
  ]);

  // Рабочий вес: лучший подход в последней тренировке периода против последней тренировки до периода.
  const byExercise = new Map<string, { name: string; sessions: Map<string, { at: Date; sets: { weightKg: number; reps: number }[] }> }>();
  for (const r of results) {
    const e = byExercise.get(r.exerciseId) ?? { name: r.exercise.name, sessions: new Map() };
    const s = e.sessions.get(r.session.id) ?? { at: r.session.startsAt, sets: [] };
    s.sets.push({ weightKg: r.weightKg, reps: r.reps });
    e.sessions.set(r.session.id, s);
    byExercise.set(r.exerciseId, e);
  }
  const exercises: Summary["exercises"] = [];
  for (const e of byExercise.values()) {
    const list = [...e.sessions.values()].sort((a, b) => a.at.getTime() - b.at.getTime());
    const before = list.filter((s) => s.at < from).at(-1);
    const during = list.filter((s) => s.at >= from);
    const lastDuring = during.at(-1);
    if (!before || !lastDuring) continue;
    const delta = (bestLift(lastDuring.sets)?.weightKg ?? 0) - (bestLift(before.sets)?.weightKg ?? 0);
    if (delta !== 0) exercises.push({ exercise: e.name, deltaKg: Math.round(delta * 10) / 10 });
  }
  exercises.sort((a, b) => b.deltaKg - a.deltaKg);

  // Замеры: последнее значение в периоде против последнего до периода.
  const fromDate = dateOnly(moscowDateString(from));
  const change = (rows: { date: Date; value: number | null }[]) => {
    const withValue = rows.filter((r) => r.value !== null) as { date: Date; value: number }[];
    const before = withValue.filter((r) => r.date < fromDate).at(-1);
    const last = withValue.filter((r) => r.date >= fromDate).at(-1);
    return before && last ? Math.round((last.value - before.value) * 10) / 10 : null;
  };
  const measures: Summary["measures"] = [];
  const w = change(weights.map((x) => ({ date: x.date, value: x.weightKg })));
  if (w !== null) measures.push({ label: "Вес", delta: w, unit: "кг" });
  for (const m of MEASURES) {
    const d = change(measurements.map((x) => ({ date: x.date, value: x[m.key] })));
    if (d !== null) measures.push({ label: m.label, delta: d, unit: m.unit });
  }

  const summary: Summary = {
    period: kind,
    completed,
    missed: missed + clientCancelled,
    records: records.map((r) => ({ exercise: r.exercise.name, weightKg: r.weightKg })),
    exercises,
    measures,
  };
  return { ...summary, text: summaryText(summary) };
}
