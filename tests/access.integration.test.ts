import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import {
  addBodyWeight,
  addClientNote,
  createClient,
  getClient,
  listClients,
  setNutritionTargets,
  updateClientProfile,
} from "@/server/services/clients";
import { createProgram, getActiveProgram, getProgram } from "@/server/services/programs";
import { createExercise } from "@/server/services/exercises";
import { makeClient, makeTrainer, resetDb } from "./helpers";
import type { ClientActor, TrainerActor } from "@/server/actor";

let trainer: TrainerActor;
let stranger: TrainerActor;
let client: ClientActor;
let otherClient: ClientActor;

const code = (c: AppError["code"]) => (e: unknown) => e instanceof AppError && e.code === c;

beforeEach(async () => {
  await resetDb();
  trainer = await makeTrainer();
  stranger = await makeTrainer();
  client = await makeClient(trainer);
  otherClient = await makeClient(trainer);
});
afterAll(() => prisma.$disconnect());

describe("клиенты", () => {
  it("тренер видит только своих клиентов", async () => {
    await makeClient(stranger);
    expect((await listClients(trainer)).map((c) => c.id).sort()).toEqual([client.clientId, otherClient.clientId].sort());
  });
  it("создание клиента: обязательная смена пароля, email уникален и нормализуется", async () => {
    const u = await createClient(trainer, { name: "Иван", email: " Ivan@Mail.RU ", password: "secret123", heightCm: "180", goal: "" });
    expect(u.email).toBe("ivan@mail.ru");
    expect(u.mustChangePassword).toBe(true);
    expect(u.clientProfile!.heightCm).toBe(180);
    expect(u.clientProfile!.goal).toBeNull();
    await expect(createClient(trainer, { name: "Дубль", email: "ivan@mail.ru", password: "secret123" })).rejects.toSatisfy(code("CONFLICT"));
  });
  it("клиент не может создавать клиентов", async () => {
    await expect(createClient(client, { name: "X", email: "x@x.ru", password: "secret123" })).rejects.toSatisfy(code("FORBIDDEN"));
  });
  it("валидация: слабый пароль, плохой email, рост вне диапазона", async () => {
    await expect(createClient(trainer, { name: "X", email: "bad", password: "1" })).rejects.toThrow();
    await expect(createClient(trainer, { name: "X", email: "a@b.ru", password: "secret123", heightCm: "999" })).rejects.toThrow(/Рост/);
  });
  it("клиент видит только себя и не видит заметки тренера", async () => {
    await addClientNote(trainer, client.clientId, { text: "Болит колено" });
    const self = await getClient(client, client.clientId);
    expect(self.notes).toBeUndefined();
    const forTrainer = await getClient(trainer, client.clientId);
    expect(forTrainer.notes).toHaveLength(1);
    await expect(getClient(client, otherClient.clientId)).rejects.toSatisfy(code("NOT_FOUND"));
    await expect(getClient(stranger, client.clientId)).rejects.toSatisfy(code("NOT_FOUND"));
  });
  it("клиент редактирует свой профиль, но не чужой", async () => {
    await updateClientProfile(client, client.clientId, { name: "Новое имя", heightCm: "175", goal: "Похудеть" });
    expect((await getClient(trainer, client.clientId)).goal).toBe("Похудеть");
    await expect(updateClientProfile(client, otherClient.clientId, { name: "x" })).rejects.toSatisfy(code("NOT_FOUND"));
  });
});

describe("питание", () => {
  it("ориентиры задаёт только тренер этого клиента", async () => {
    const t = { calories: "2200", proteinG: "150", fatG: "70", carbsG: "240" };
    await setNutritionTargets(trainer, client.clientId, t);
    expect((await getClient(client, client.clientId)).nutrition?.calories).toBe(2200);
    await expect(setNutritionTargets(client, client.clientId, t)).rejects.toSatisfy(code("FORBIDDEN"));
    await expect(setNutritionTargets(stranger, client.clientId, t)).rejects.toSatisfy(code("NOT_FOUND"));
    await expect(setNutritionTargets(trainer, client.clientId, { ...t, calories: "" })).rejects.toThrow(/Калории/);
  });
});

describe("вес тела", () => {
  it("одна запись на дату, повтор перезаписывает", async () => {
    await addBodyWeight(client, client.clientId, { date: "2026-10-01", weightKg: "80.5" });
    await addBodyWeight(client, client.clientId, { date: "2026-10-01", weightKg: "80.1" });
    const c = await getClient(client, client.clientId);
    expect(c.bodyWeights.map((b) => b.weightKg)).toEqual([80.1]);
    await expect(addBodyWeight(client, otherClient.clientId, { date: "2026-10-01", weightKg: 70 })).rejects.toSatisfy(code("NOT_FOUND"));
    await expect(addBodyWeight(client, client.clientId, { date: "2026-13-01", weightKg: 70 })).rejects.toThrow();
  });
});

describe("программы", () => {
  it("первая программа становится текущей; клиент видит только свою", async () => {
    const ex = await createExercise(trainer, { name: "Жим" });
    const p = await createProgram(trainer, client.clientId, {
      name: "Сила",
      items: [{ exerciseId: ex.id, sets: "4", reps: "6–8", weightKg: "" }],
    });
    expect(p.isActive).toBe(true);
    const active = await getActiveProgram(client, client.clientId);
    expect(active?.exercises[0].exercise.name).toBe("Жим");
    expect(active?.exercises[0].weightKg).toBeNull();
    await expect(getProgram(otherClient, p.id)).rejects.toSatisfy(code("NOT_FOUND"));
    await expect(createProgram(client, client.clientId, { name: "x", items: [] })).rejects.toSatisfy(code("FORBIDDEN"));
  });
});
