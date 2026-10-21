import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { cancelSession, createSession, markMissed, saveSessionResults } from "@/server/services/sessions";
import { createExercise } from "@/server/services/exercises";
import { saveMeasurement } from "@/server/services/measurements";
import { buildSummary } from "@/server/services/summary";
import { moscowLocalToDate } from "@/lib/time";
import { makeClient, makeTrainer, resetDb } from "./helpers";
import type { ClientActor, TrainerActor } from "@/server/actor";

let trainer: TrainerActor;
let client: ClientActor;
const NOW = moscowLocalToDate("2026-10-23", "20:00"); // пятница; неделя с 19.10
const LONG_AGO = new Date("2026-09-01T00:00:00Z");

beforeEach(async () => {
  await resetDb();
  trainer = await makeTrainer();
  client = await makeClient(trainer);
});
afterAll(() => prisma.$disconnect());

describe("итог недели", () => {
  it("тренировки, пропуски, рекорд, рост веса и замеры", async () => {
    const squat = await createExercise(trainer, { name: "Присед" });
    const done = async (date: string, w: number) => {
      const s = await createSession(trainer, { clientId: client.clientId, date, time: "10:00" }, LONG_AGO);
      await saveSessionResults(trainer, s.id, { sets: [{ exerciseId: squat.id, weightKg: w, reps: 8 }] }, NOW);
    };
    await done("2026-10-14", 60); // прошлая неделя
    await done("2026-10-20", 65); // рекорд на этой неделе
    await done("2026-10-22", 62.5);
    const missed = await createSession(trainer, { clientId: client.clientId, date: "2026-10-21", time: "10:00" }, LONG_AGO);
    await markMissed(trainer, missed.id, NOW);
    const cancelledByTrainer = await createSession(trainer, { clientId: client.clientId, date: "2026-10-23", time: "10:00" }, LONG_AGO);
    await cancelSession(trainer, cancelledByTrainer.id, LONG_AGO); // не пропуск клиента
    await saveMeasurement(client, client.clientId, { date: "2026-10-10", weightKg: "80", waistCm: "92" });
    await saveMeasurement(client, client.clientId, { date: "2026-10-22", weightKg: "79", waistCm: "90" });

    const s = await buildSummary(client, client.clientId, "week", NOW);
    expect([s.completed, s.missed]).toEqual([2, 1]);
    expect(s.records).toEqual([{ exercise: "Присед", weightKg: 65 }]);
    expect(s.exercises).toEqual([expect.objectContaining({ exercise: "Присед", deltaKg: 2.5 })]);
    expect(s.measures).toEqual([{ label: "Вес", delta: -1, unit: "кг" }, { label: "Талия", delta: -2, unit: "см" }]);
    expect(s.text.headline).toBe("2 тренировки, пропусков: 1");
    // тренер видит ту же сводку
    expect((await buildSummary(trainer, client.clientId, "week", NOW)).completed).toBe(2);
  });
});
