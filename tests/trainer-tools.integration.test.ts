import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { setPushSender } from "@/server/push";
import { createSession, rescheduleSession, saveResultsDraft, saveSessionResults } from "@/server/services/sessions";
import { createClient, deleteClient, updateClientProfile } from "@/server/services/clients";
import { createExercise } from "@/server/services/exercises";
import { createMembership } from "@/server/services/memberships";
import { AppError } from "@/server/errors";
import { moscowLocalToDate } from "@/lib/time";
import { makeClient, makeTrainer, resetDb } from "./helpers";
import type { ClientActor, TrainerActor } from "@/server/actor";

const M = 60_000;
const H = 60 * M;
const START = moscowLocalToDate("2026-10-20", "18:00");
const at = (msFromStart: number) => new Date(START.getTime() + msFromStart);
const BEFORE = at(-48 * H);
const code = (c: AppError["code"]) => (e: unknown) => e instanceof AppError && e.code === c;
const minutes = (s: { startsAt: Date; endsAt: Date }) => (s.endsAt.getTime() - s.startsAt.getTime()) / M;

let trainer: TrainerActor;
let client: ClientActor;

beforeEach(async () => {
  await resetDb();
  trainer = await makeTrainer();
  client = await makeClient(trainer);
  setPushSender(async () => "ok");
});
afterEach(() => setPushSender(null));
afterAll(() => prisma.$disconnect());

const book = (time = "18:00", extra: Record<string, unknown> = {}) =>
  createSession(trainer, { clientId: client.clientId, date: "2026-10-20", time, ...extra }, BEFORE);

describe("длительность занятия", () => {
  it("по умолчанию 90 минут; тренер выбирает 60 или 75", async () => {
    expect(minutes(await book("10:00"))).toBe(90);
    expect(minutes(await book("12:00", { durationMin: "60" }))).toBe(60);
    expect(minutes(await book("14:00", { durationMin: "75" }))).toBe(75);
    await expect(book("16:00", { durationMin: "45" })).rejects.toThrow("60, 75 или 90");
  });

  it("клиент записывается на длительность из своего профиля и сам её не выбирает", async () => {
    await updateClientProfile(trainer, client.clientId, { name: "Клиент", sessionDurationMin: "75" });
    const s = await createSession(client, { date: "2026-10-20", time: "10:00" }, BEFORE);
    expect(minutes(s)).toBe(75);
    await expect(createSession(client, { date: "2026-10-20", time: "14:00", durationMin: "60" }, BEFORE)).rejects.toSatisfy(code("FORBIDDEN"));
    // клиент, правя свой профиль, длительность не меняет
    await updateClientProfile(client, client.clientId, { name: "Клиент", sessionDurationMin: "60" });
    expect((await prisma.clientProfile.findUniqueOrThrow({ where: { id: client.clientId } })).sessionDurationMin).toBe(75);
  });

  it("при переносе длительность сохраняется, тренер может её поменять", async () => {
    const s = await book("10:00", { durationMin: "60" });
    const moved = await rescheduleSession(trainer, s.id, { date: "2026-10-20", time: "11:00" }, BEFORE);
    expect(minutes(moved)).toBe(60);
    const longer = await rescheduleSession(trainer, s.id, { date: "2026-10-20", time: "11:00", durationMin: "90" }, BEFORE);
    expect(minutes(longer)).toBe(90);
  });

  it("пересечения считаются по реальной длительности", async () => {
    await book("10:00", { durationMin: "60" });
    await expect(book("10:45")).rejects.toSatisfy(code("CONFLICT"));
    expect(minutes(await book("11:00", { durationMin: "75" }))).toBe(75);
  });
});

describe("результаты во время тренировки", () => {
  const draft = (exerciseId: string, savedAt: number, weightKg = "50") => ({ notes: "идёт", sets: [{ exerciseId, weightKg, reps: "" }], savedAt });

  it("черновик сохраняется с пустыми полями, ничего не завершает и не уведомляет клиента", async () => {
    const ex = await createExercise(trainer, { name: "Жим" });
    const s = await book();
    await expect(saveResultsDraft(trainer, s.id, draft(ex.id, 1), at(-20 * M))).rejects.toSatisfy(code("CONFLICT"));
    await saveResultsDraft(trainer, s.id, draft(ex.id, 2), at(-10 * M)); // за 15 минут до начала уже можно
    const row = await prisma.session.findUniqueOrThrow({ where: { id: s.id } });
    expect(row.status).toBe("SCHEDULED");
    expect(row.resultsDraft).toMatchObject({ savedAt: 2, sets: [{ weightKg: "50", reps: "" }] });
    expect(await prisma.sessionResult.count()).toBe(0);
    expect(await prisma.notification.count({ where: { userId: client.userId, type: "results" } })).toBe(0);
  });

  it("старая версия не затирает новую (запросы пришли не по порядку)", async () => {
    const ex = await createExercise(trainer, { name: "Жим" });
    const s = await book();
    await saveResultsDraft(trainer, s.id, draft(ex.id, 200, "60"), at(5 * M));
    await saveResultsDraft(trainer, s.id, draft(ex.id, 100, "40"), at(6 * M));
    const row = await prisma.session.findUniqueOrThrow({ where: { id: s.id } });
    expect(row.resultsDraft).toMatchObject({ savedAt: 200, sets: [{ weightKg: "60" }] });
  });

  it("«Завершить» записывает результаты, списывает занятие и убирает черновик; после этого черновик не принимается", async () => {
    const ex = await createExercise(trainer, { name: "Жим" });
    await createMembership(trainer, client.clientId, { totalSessions: "8", validFrom: "2026-10-01", validUntil: "2026-11-30" });
    const s = await book();
    await saveResultsDraft(trainer, s.id, draft(ex.id, 1), at(10 * M));
    const outcome = await saveSessionResults(trainer, s.id, { notes: "", sets: [{ exerciseId: ex.id, weightKg: "50", reps: "10" }] }, at(80 * M));
    expect(outcome.remaining).toBe(7);
    const row = await prisma.session.findUniqueOrThrow({ where: { id: s.id } });
    expect(row.status).toBe("COMPLETED");
    expect(row.resultsDraft).toBeNull();
    await expect(saveResultsDraft(trainer, s.id, draft(ex.id, 5), at(85 * M))).rejects.toSatisfy(code("CONFLICT"));
  });

  it("черновик ведёт только тренер и только со своими упражнениями", async () => {
    const ex = await createExercise(trainer, { name: "Жим" });
    const other = await makeTrainer();
    const foreign = await createExercise(other, { name: "Чужое" });
    const s = await book();
    await expect(saveResultsDraft(client, s.id, draft(ex.id, 1), at(5 * M))).rejects.toSatisfy(code("FORBIDDEN"));
    await expect(saveResultsDraft(trainer, s.id, draft(foreign.id, 1), at(5 * M))).rejects.toSatisfy(code("VALIDATION"));
  });
});

describe("удаление клиента", () => {
  it("удаляет аккаунт и все данные клиента, другие клиенты не затронуты", async () => {
    const ex = await createExercise(trainer, { name: "Жим" });
    const other = await makeClient(trainer);
    const s = await book();
    await saveSessionResults(trainer, s.id, { notes: "", sets: [{ exerciseId: ex.id, weightKg: "50", reps: "10" }] }, at(2 * H));
    await createMembership(trainer, client.clientId, { totalSessions: "8", validFrom: "2026-10-01", validUntil: "2026-11-30" });
    const keep = await createSession(trainer, { clientId: other.clientId, date: "2026-10-21", time: "10:00" }, BEFORE);
    await prisma.notification.create({ data: { userId: trainer.userId, type: "booking", title: "x", body: "x", url: `/trainer/sessions/${s.id}` } });
    await prisma.notification.create({ data: { userId: trainer.userId, type: "booking", title: "y", body: "y", url: `/trainer/sessions/${keep.id}` } });

    const name = await deleteClient(trainer, client.clientId);
    expect(name).toMatch(/^Клиент \d+$/);
    expect(await prisma.user.findUnique({ where: { id: client.userId } })).toBeNull();
    expect(await prisma.clientProfile.findUnique({ where: { id: client.clientId } })).toBeNull();
    expect(await prisma.session.count({ where: { clientId: client.clientId } })).toBe(0);
    expect(await prisma.sessionResult.count()).toBe(0);
    expect(await prisma.membership.count()).toBe(0);
    // упражнения тренера остаются, второй клиент и его записи — тоже
    expect(await prisma.exercise.count()).toBe(1);
    expect(await prisma.session.count({ where: { clientId: other.clientId } })).toBe(1);
    expect((await prisma.notification.findMany({ where: { userId: trainer.userId } })).map((n) => n.title)).toEqual(["y"]);
  });

  it("после удаления email свободен — клиента можно создать заново", async () => {
    const created = await createClient(trainer, { name: "Анна", email: "anna@test.local", password: "password1" });
    await deleteClient(trainer, created.clientProfile!.id);
    await expect(createClient(trainer, { name: "Анна", email: "anna@test.local", password: "password2" })).resolves.toBeTruthy();
  });

  it("удалить может только свой тренер", async () => {
    const stranger = await makeTrainer();
    await expect(deleteClient(client, client.clientId)).rejects.toSatisfy(code("FORBIDDEN"));
    await expect(deleteClient(stranger, client.clientId)).rejects.toSatisfy(code("NOT_FOUND"));
    expect(await prisma.clientProfile.count({ where: { id: client.clientId } })).toBe(1);
  });
});
