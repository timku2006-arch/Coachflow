import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { measurementSeries, saveMeasurement, seriesDelta } from "@/server/services/measurements";
import { AppError } from "@/server/errors";
import { makeClient, makeTrainer, resetDb } from "./helpers";
import type { ClientActor, TrainerActor } from "@/server/actor";

let trainer: TrainerActor;
let client: ClientActor;
beforeEach(async () => {
  await resetDb();
  trainer = await makeTrainer();
  client = await makeClient(trainer);
});
afterAll(() => prisma.$disconnect());

describe("замеры тела", () => {
  it("тренер и клиент вносят замеры; разница считается от первого", async () => {
    await saveMeasurement(trainer, client.clientId, { date: "2026-09-01", weightKg: "82", waistCm: "94", hipsCm: "104" });
    await saveMeasurement(client, client.clientId, { date: "2026-10-01", weightKg: "79.5", waistCm: "90.5" });
    const s = Object.fromEntries((await measurementSeries(client, client.clientId)).map((x) => [x.key, x]));
    expect(s.weightKg.delta).toBe(-2.5);
    expect(s.waistCm.delta).toBe(-3.5);
    expect(s.hipsCm.points).toHaveLength(1);
    expect(s.hipsCm.delta).toBeNull(); // один замер — сравнивать не с чем
  });
  it("повторный ввод за ту же дату дополняет, а не стирает", async () => {
    await saveMeasurement(client, client.clientId, { date: "2026-10-01", waistCm: "90", chestCm: "100" });
    await saveMeasurement(client, client.clientId, { date: "2026-10-01", armCm: "33" });
    const row = await prisma.bodyMeasurement.findFirstOrThrow();
    expect([row.waistCm, row.chestCm, row.armCm]).toEqual([90, 100, 33]);
  });
  it("валидация: пустая форма и нереальные значения отклоняются; чужой клиент недоступен", async () => {
    await expect(saveMeasurement(client, client.clientId, { date: "2026-10-01" })).rejects.toThrow(/хотя бы один/);
    await expect(saveMeasurement(client, client.clientId, { date: "2026-10-01", waistCm: "5" })).rejects.toThrow(/Талия/);
    const other = await makeClient(trainer);
    await expect(saveMeasurement(client, other.clientId, { date: "2026-10-01", waistCm: "80" })).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === "NOT_FOUND");
  });
  it("seriesDelta округляет до десятых", () => {
    expect(seriesDelta([{ value: 90.33 }, { value: 88.1 }])).toBe(-2.2);
  });
});
