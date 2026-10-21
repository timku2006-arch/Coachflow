import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createSession, saveSessionResults } from "@/server/services/sessions";
import { createExercise } from "@/server/services/exercises";
import { adjustRemaining, createMembership, currentMembership, markPaid, runMembershipReminders } from "@/server/services/memberships";
import { listNotifications } from "@/server/services/notifications";
import { AppError } from "@/server/errors";
import { moscowLocalToDate } from "@/lib/time";
import { makeClient, makeTrainer, resetDb } from "./helpers";
import type { ClientActor, TrainerActor } from "@/server/actor";

let trainer: TrainerActor;
let client: ClientActor;
let ex: { id: string };
const LONG_AGO = new Date("2026-09-01T00:00:00Z");
const AFTER = new Date("2026-12-31T00:00:00Z");
const code = (c: AppError["code"]) => (e: unknown) => e instanceof AppError && e.code === c;

async function trained(date: string, time = "10:00") {
  const s = await createSession(trainer, { clientId: client.clientId, date, time }, LONG_AGO);
  const out = await saveSessionResults(trainer, s.id, { sets: [{ exerciseId: ex.id, weightKg: 50, reps: 10 }] }, AFTER);
  return { s, out };
}

beforeEach(async () => {
  await resetDb();
  trainer = await makeTrainer();
  client = await makeClient(trainer);
  ex = await createExercise(trainer, { name: "Присед" });
});
afterAll(() => prisma.$disconnect());

describe("абонементы", () => {
  it("проведённая тренировка списывает одно занятие; пересохранение результатов не списывает повторно", async () => {
    await createMembership(trainer, client.clientId, { totalSessions: "8", validFrom: "2026-10-01", validUntil: "2026-10-31", paid: "on" });
    const { s, out } = await trained("2026-10-05");
    expect(out.remaining).toBe(7);
    const again = await saveSessionResults(trainer, s.id, { sets: [{ exerciseId: ex.id, weightKg: 55, reps: 10 }] }, AFTER);
    expect(again.remaining).toBeNull();
    expect((await currentMembership(client, client.clientId, new Date("2026-10-06T10:00:00Z")))?.remainingSessions).toBe(7);
  });
  it("тренировка вне срока абонемента не списывается", async () => {
    await createMembership(trainer, client.clientId, { totalSessions: "4", validFrom: "2026-10-10", validUntil: "2026-10-31" });
    const { out } = await trained("2026-10-05");
    expect(out.remaining).toBeNull();
  });
  it("остаток 2 — одно напоминание клиенту и тренеру", async () => {
    await createMembership(trainer, client.clientId, { totalSessions: "3", validFrom: "2026-10-01", validUntil: "2026-10-31" });
    await trained("2026-10-02");
    const both = async () => [(await listNotifications(client.userId)).filter((n) => n.type === "membership").length, (await listNotifications(trainer.userId)).filter((n) => n.type === "membership").length];
    expect(await both()).toEqual([1, 1]);
    expect((await listNotifications(client.userId)).find((n) => n.type === "membership")?.title).toBe("По абонементу осталось 2 занятия");
    await trained("2026-10-04"); // остаток 1 — уже напоминали
    expect(await both()).toEqual([1, 1]);
  });
  it("за 7 дней до конца — напоминание один раз", async () => {
    await createMembership(trainer, client.clientId, { totalSessions: "10", validFrom: "2026-10-01", validUntil: "2026-10-28" });
    expect(await runMembershipReminders(moscowLocalToDate("2026-10-20", "12:00"))).toBe(0); // 8 дней
    expect(await runMembershipReminders(moscowLocalToDate("2026-10-21", "12:00"))).toBe(1); // 7 дней
    expect(await runMembershipReminders(moscowLocalToDate("2026-10-22", "12:00"))).toBe(0);
    expect((await listNotifications(client.userId))[0].title).toBe("Абонемент действует до 28 октября 2026");
  });
  it("ручная корректировка и отметка оплаты; клиенту — запрещено", async () => {
    const mb = await createMembership(trainer, client.clientId, { totalSessions: "8", validFrom: "2026-10-01", validUntil: "2026-10-31" });
    const adj = await adjustRemaining(trainer, mb.id, { remainingSessions: "5", note: "Перенос с прошлого месяца" });
    expect(adj.remainingSessions).toBe(5);
    const paid = await markPaid(trainer, mb.id, new Date("2026-10-02T10:00:00Z"));
    expect(paid.paidAt?.toISOString()).toBe("2026-10-02T10:00:00.000Z");
    await expect(markPaid(trainer, mb.id)).rejects.toSatisfy(code("CONFLICT"));
    await expect(adjustRemaining(client, mb.id, { remainingSessions: "99" })).rejects.toSatisfy(code("FORBIDDEN"));
    await expect(adjustRemaining(trainer, mb.id, { remainingSessions: "-1" })).rejects.toThrow(/меньше 0/);
    const entries = await prisma.membershipEntry.findMany({ where: { membershipId: mb.id } });
    expect(entries.map((e) => e.reason).sort()).toEqual(["manual", "manual", "payment"]);
  });
  it("валидация: срок «до» раньше «с» и ноль занятий отклоняются; чужой тренер не может завести", async () => {
    await expect(createMembership(trainer, client.clientId, { totalSessions: "8", validFrom: "2026-10-10", validUntil: "2026-10-01" })).rejects.toThrow(/раньше/);
    await expect(createMembership(trainer, client.clientId, { totalSessions: "0", validFrom: "2026-10-01", validUntil: "2026-10-31" })).rejects.toThrow(/Минимум/);
    const stranger = await makeTrainer();
    await expect(createMembership(stranger, client.clientId, { totalSessions: "8", validFrom: "2026-10-01", validUntil: "2026-10-31" })).rejects.toSatisfy(code("NOT_FOUND"));
  });
});
