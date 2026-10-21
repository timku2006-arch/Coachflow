import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertClientAccess } from "../access";
import { notFound } from "../errors";
import { measurementSchema } from "@/lib/validation";
import { dateOnly, dateOnlyToString } from "@/lib/time";

export const MEASURES = [
  { key: "weightKg", label: "Вес тела", unit: "кг" },
  { key: "waistCm", label: "Талия", unit: "см" },
  { key: "hipsCm", label: "Бёдра", unit: "см" },
  { key: "chestCm", label: "Грудь", unit: "см" },
  { key: "armCm", label: "Руки", unit: "см" },
] as const;
export type MeasureKey = (typeof MEASURES)[number]["key"];
export type MeasureSeries = { key: MeasureKey; label: string; unit: string; points: { date: string; value: number }[]; first: number | null; last: number | null; delta: number | null };

/** Один замер на дату: повторный ввод за ту же дату обновляет значения. Вес пишется в общую историю веса. */
export async function saveMeasurement(actor: Actor, clientId: string, input: unknown) {
  await assertClientAccess(prisma, actor, clientId);
  const data = measurementSchema.parse(input);
  const date = dateOnly(data.date);
  await prisma.$transaction(async (tx) => {
    if (data.weightKg !== null) {
      await tx.bodyWeightEntry.upsert({
        where: { clientId_date: { clientId, date } },
        create: { clientId, date, weightKg: data.weightKg },
        update: { weightKg: data.weightKg },
      });
    }
    const body = { waistCm: data.waistCm, hipsCm: data.hipsCm, chestCm: data.chestCm, armCm: data.armCm };
    if (Object.values(body).some((v) => v !== null)) {
      const existing = await tx.bodyMeasurement.findUnique({ where: { clientId_date: { clientId, date } } });
      // пустое поле не стирает ранее внесённое значение за эту дату
      const merged = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, v ?? (existing?.[k as keyof typeof body] ?? null)]));
      await tx.bodyMeasurement.upsert({
        where: { clientId_date: { clientId, date } },
        create: { clientId, date, createdById: actor.userId, ...merged },
        update: merged,
      });
    }
  });
}

export async function deleteMeasurement(actor: Actor, id: string) {
  const m = await prisma.bodyMeasurement.findUnique({ where: { id } });
  if (!m) throw notFound("Замер");
  await assertClientAccess(prisma, actor, m.clientId);
  await prisma.bodyMeasurement.delete({ where: { id } });
}

/** Разница последнего значения с первым (округление до 0,1). */
export function seriesDelta(points: { value: number }[]) {
  if (points.length < 2) return null;
  return Math.round((points[points.length - 1].value - points[0].value) * 10) / 10;
}

/** Ряды по каждому параметру для графиков. */
export async function measurementSeries(actor: Actor, clientId: string): Promise<MeasureSeries[]> {
  await assertClientAccess(prisma, actor, clientId);
  const [weights, rows] = await Promise.all([
    prisma.bodyWeightEntry.findMany({ where: { clientId }, orderBy: { date: "asc" } }),
    prisma.bodyMeasurement.findMany({ where: { clientId }, orderBy: { date: "asc" } }),
  ]);
  return MEASURES.map((m) => {
    const points =
      m.key === "weightKg"
        ? weights.map((w) => ({ date: dateOnlyToString(w.date), value: w.weightKg }))
        : rows.filter((r) => r[m.key] !== null).map((r) => ({ date: dateOnlyToString(r.date), value: r[m.key] as number }));
    return { key: m.key, label: m.label, unit: m.unit, points, first: points[0]?.value ?? null, last: points.at(-1)?.value ?? null, delta: seriesDelta(points) };
  });
}

export async function listMeasurements(actor: Actor, clientId: string) {
  await assertClientAccess(prisma, actor, clientId);
  return prisma.bodyMeasurement.findMany({ where: { clientId }, orderBy: { date: "desc" } });
}
