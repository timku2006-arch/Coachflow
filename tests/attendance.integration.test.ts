import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { setPushSender, type PushPayload } from "@/server/push";
import { drainPush, savePushSubscription } from "@/server/services/notifications";
import { cancelSession, confirmAttendance, createSession, markMissed, rescheduleSession } from "@/server/services/sessions";
import { runReminders } from "@/server/services/reminders";
import { attendanceOf } from "@/lib/session-phase";
import { AppError } from "@/server/errors";
import { moscowLocalToDate } from "@/lib/time";
import { makeClient, makeTrainer, resetDb } from "./helpers";
import type { ClientActor, TrainerActor } from "@/server/actor";

const H = 3_600_000;
const M = 60_000;
const START = moscowLocalToDate("2026-10-20", "18:00");
const at = (msBefore: number) => new Date(START.getTime() - msBefore);
const LONG_BEFORE = at(48 * H);
const code = (c: AppError["code"]) => (e: unknown) => e instanceof AppError && e.code === c;

let trainer: TrainerActor;
let client: ClientActor;
let sent: PushPayload[];

beforeEach(async () => {
  await resetDb();
  trainer = await makeTrainer();
  client = await makeClient(trainer);
  sent = [];
  setPushSender(async (_t, p) => {
    sent.push(p);
    return "ok";
  });
});
afterEach(() => setPushSender(null));
afterAll(() => prisma.$disconnect());

const book = () => createSession(trainer, { clientId: client.clientId, date: "2026-10-20", time: "18:00" }, LONG_BEFORE);

describe("подтверждение явки", () => {
  it("запись тренера ждёт подтверждения; «Приду» подтверждает и уведомляет тренера", async () => {
    const s = await book();
    expect(attendanceOf(s, LONG_BEFORE)).toBe("pending");
    const c = await confirmAttendance(client, s.id, at(20 * H));
    expect(attendanceOf(c, at(20 * H))).toBe("confirmed");
    const again = await confirmAttendance(client, s.id, at(19 * H));
    expect(again.confirmedAt?.toISOString()).toBe(c.confirmedAt?.toISOString()); // повторное нажатие ничего не меняет
    expect(await prisma.notification.count({ where: { userId: trainer.userId, type: "attendance" } })).toBe(1);
  });
  it("запись, сделанная клиентом, сразу подтверждена; перенос тренером сбрасывает подтверждение", async () => {
    const s = await createSession(client, { date: "2026-10-20", time: "18:00" }, LONG_BEFORE);
    expect(attendanceOf(s, LONG_BEFORE)).toBe("confirmed");
    const moved = await rescheduleSession(trainer, s.id, { date: "2026-10-21", time: "18:00" }, LONG_BEFORE);
    expect(attendanceOf(moved, LONG_BEFORE)).toBe("pending");
  });
  it("«Не смогу» — отмена по правилу 3 часов: 3:01 можно, 2:59 нельзя (даже после «Приду»)", async () => {
    const s = await book();
    await confirmAttendance(client, s.id, at(10 * H));
    await expect(cancelSession(client, s.id, at(3 * H - M))).rejects.toSatisfy(code("TOO_LATE"));
    const c = await cancelSession(client, s.id, at(3 * H + M));
    expect(attendanceOf(c)).toBe("cancelled");
  });
  it("подтвердить можно только свою будущую запись", async () => {
    const s = await book();
    const other = await makeClient(trainer);
    await expect(confirmAttendance(other, s.id, at(H))).rejects.toSatisfy(code("NOT_FOUND"));
    await expect(confirmAttendance(trainer, s.id, at(H))).rejects.toSatisfy(code("FORBIDDEN"));
    await expect(confirmAttendance(client, s.id, at(-M))).rejects.toSatisfy(code("CONFLICT"));
  });
  it("напоминание за сутки: push с кнопками «Приду» и «Не смогу» и ссылкой на экран ответа", async () => {
    const s = await book();
    await savePushSubscription(client.userId, { endpoint: "https://push.example.com/a", keys: { p256dh: "k", auth: "a" } });
    await runReminders(at(23 * H));
    await drainPush();
    const p = sent.find((x) => x.tag === "attendance");
    expect(p?.actions?.map((a) => a.title)).toEqual(["Приду", "Не смогу"]);
    expect(p?.url).toBe(`/client/sessions/${s.id}/confirm`);
    expect(p?.sessionId).toBe(s.id);
  });
  it("уже подтверждённым — напоминание без вопроса", async () => {
    const s = await createSession(client, { date: "2026-10-20", time: "18:00" }, LONG_BEFORE);
    await savePushSubscription(client.userId, { endpoint: "https://push.example.com/b", keys: { p256dh: "k", auth: "a" } });
    await runReminders(at(23 * H));
    await drainPush();
    expect(sent.find((x) => x.tag === "attendance")).toBeUndefined();
    expect(sent.some((x) => x.body === "Ждём вас!" && x.url === `/client/sessions/${s.id}`)).toBe(true);
  });
  it("неявку отмечает тренер и только после начала", async () => {
    const s = await book();
    await expect(markMissed(trainer, s.id, at(H))).rejects.toSatisfy(code("CONFLICT"));
    await expect(markMissed(client, s.id, at(-2 * H))).rejects.toSatisfy(code("FORBIDDEN"));
    expect((await markMissed(trainer, s.id, at(-2 * H))).status).toBe("MISSED");
  });
});
