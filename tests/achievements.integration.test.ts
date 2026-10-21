import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createSession, saveSessionResults } from "@/server/services/sessions";
import { createExercise } from "@/server/services/exercises";
import { evaluateAchievements, listAchievements } from "@/server/services/achievements";
import { listNotifications } from "@/server/services/notifications";
import { makeClient, makeTrainer, resetDb } from "./helpers";
import type { ClientActor, TrainerActor } from "@/server/actor";

let trainer: TrainerActor;
let client: ClientActor;
let ex: { id: string };
const LONG_AGO = new Date("2026-09-01T00:00:00Z");
const AFTER = new Date("2026-12-31T00:00:00Z");

beforeEach(async () => {
  await resetDb();
  trainer = await makeTrainer();
  client = await makeClient(trainer);
  ex = await createExercise(trainer, { name: "Тяга" });
});
afterAll(() => prisma.$disconnect());

describe("начисление значков", () => {
  it("первая тренировка даёт значок и уведомление; повторная проверка не дублирует", async () => {
    const s = await createSession(trainer, { clientId: client.clientId, date: "2026-10-05", time: "10:00" }, LONG_AGO);
    const out = await saveSessionResults(trainer, s.id, { sets: [{ exerciseId: ex.id, weightKg: 40, reps: 10 }] }, AFTER);
    expect(out.badges.map((b) => b.code)).toContain("first_workout");
    expect(await evaluateAchievements(client.clientId)).toEqual([]);
    expect(await prisma.clientAchievement.count({ where: { code: "first_workout" } })).toBe(1);
    expect((await listNotifications(client.userId)).some((n) => n.title === "Новый значок: «Первая тренировка»")).toBe(true);
  });
  it("рекорд даёт значок «Первый рекорд»; экран показывает и полученные, и прогресс к остальным", async () => {
    for (const [date, w] of [["2026-10-05", 40], ["2026-10-07", 45]] as const) {
      const s = await createSession(trainer, { clientId: client.clientId, date, time: "10:00" }, LONG_AGO);
      await saveSessionResults(trainer, s.id, { sets: [{ exerciseId: ex.id, weightKg: w, reps: 10 }] }, AFTER);
    }
    const list = await listAchievements(client, client.clientId);
    const byCode = Object.fromEntries(list.map((b) => [b.code, b]));
    expect(byCode.first_record.earnedAt).not.toBeNull();
    expect(byCode.workouts_5.earnedAt).toBeNull();
    expect(byCode.workouts_5.progress).toEqual({ value: 2, target: 5 });
  });
});
