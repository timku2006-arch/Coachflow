import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createSession, saveSessionResults } from "@/server/services/sessions";
import { createExercise } from "@/server/services/exercises";
import { listRecords } from "@/server/services/records";
import { listNotifications } from "@/server/services/notifications";
import { AppError } from "@/server/errors";
import { makeClient, makeTrainer, resetDb } from "./helpers";
import type { ClientActor, TrainerActor } from "@/server/actor";

let trainer: TrainerActor;
let client: ClientActor;
let bench: { id: string };
const LONG_AGO = new Date("2026-09-01T00:00:00Z");
const AFTER = new Date("2026-12-31T00:00:00Z");

async function workout(date: string, sets: [number, number][]) {
  const s = await createSession(trainer, { clientId: client.clientId, date, time: "10:00" }, LONG_AGO);
  const out = await saveSessionResults(trainer, s.id, { sets: sets.map(([w, r]) => ({ exerciseId: bench.id, weightKg: w, reps: r })) }, AFTER);
  return { s, out };
}

beforeEach(async () => {
  await resetDb();
  trainer = await makeTrainer();
  client = await makeClient(trainer);
  bench = await createExercise(trainer, { name: "Жим лёжа" });
});
afterAll(() => prisma.$disconnect());

describe("рекорды при сохранении результатов", () => {
  it("первая тренировка — без рекорда, следующая с большим весом — рекорд и уведомление клиенту", async () => {
    const first = await workout("2026-10-01", [[70, 8], [75, 6]]);
    expect(first.out.records).toEqual([]);
    const second = await workout("2026-10-03", [[75, 8], [80, 5]]);
    expect(second.out.records.map((r) => r.title)).toEqual(["Новый рекорд: жим лёжа 80 кг!"]);
    const n = await listNotifications(client.userId);
    expect(n.some((x) => x.type === "record" && x.title.includes("жим лёжа 80 кг"))).toBe(true);
  });
  it("тот же вес и больше повторений — рекорд; повторное сохранение не дублирует", async () => {
    await workout("2026-10-01", [[80, 5]]);
    const { s, out } = await workout("2026-10-03", [[80, 6]]);
    expect(out.records).toHaveLength(1);
    const again = await saveSessionResults(trainer, s.id, { sets: [{ exerciseId: bench.id, weightKg: 80, reps: 6 }] }, AFTER);
    expect(again.records).toHaveLength(0); // уже был — повторно не поздравляем
    expect(await prisma.personalRecord.count()).toBe(1);
  });
  it("исправление результата вниз убирает рекорд", async () => {
    await workout("2026-10-01", [[80, 5]]);
    const { s } = await workout("2026-10-03", [[85, 3]]);
    await saveSessionResults(trainer, s.id, { sets: [{ exerciseId: bench.id, weightKg: 75, reps: 5 }] }, AFTER);
    expect(await prisma.personalRecord.count()).toBe(0);
  });
  it("тренировка «задним числом» сравнивается только с более ранними", async () => {
    await workout("2026-10-10", [[90, 3]]);
    const early = await workout("2026-10-01", [[60, 10]]); // раньше всех — сравнивать не с чем
    expect(early.out.records).toEqual([]);
  });
  it("рекорды видят клиент и его тренер, но не чужой тренер", async () => {
    await workout("2026-10-01", [[70, 5]]);
    await workout("2026-10-03", [[72.5, 5]]);
    expect((await listRecords(client, client.clientId)).map((r) => r.weightKg)).toEqual([72.5]);
    expect(await listRecords(trainer, client.clientId)).toHaveLength(1);
    const stranger = await makeTrainer();
    await expect(listRecords(stranger, client.clientId)).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === "NOT_FOUND");
  });
});
