import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { setPushSender } from "@/server/push";
import { drainPush } from "@/server/services/notifications";
import { createSession, rescheduleSession, saveSessionResults } from "@/server/services/sessions";
import { createTimeOff, deleteTimeOff, setWeeklyDaysOff } from "@/server/services/days-off";
import { pendingFeedback, runFeedbackRequests, saveFeedback, saveFeedbackNote } from "@/server/services/feedback";
import { createExercise } from "@/server/services/exercises";
import { listClients } from "@/server/services/clients";
import { AppError } from "@/server/errors";
import { dayOffReason, isoWeekday } from "@/lib/days-off";
import { moscowLocalToDate } from "@/lib/time";
import { makeClient, makeTrainer, resetDb } from "./helpers";
import type { ClientActor, TrainerActor } from "@/server/actor";

const M = 60_000;
// Вторник 20.10.2026, за неделю до всех дат
const NOW = moscowLocalToDate("2026-10-13", "09:00");
const code = (c: AppError["code"]) => (e: unknown) => e instanceof AppError && e.code === c;

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

const clientBook = (date: string, time = "10:00", now = NOW) => createSession(client, { date, time }, now);
const trainerBook = (date: string, time = "10:00", c = client, now = NOW) => createSession(trainer, { clientId: c.clientId, date, time }, now);

describe("дни недели", () => {
  it("isoWeekday и причины закрытия", () => {
    expect(isoWeekday("2026-10-25")).toBe(7); // воскресенье
    expect(isoWeekday("2026-10-26")).toBe(1);
    const off = { weekly: [7], periods: [{ startsOn: "2026-10-27", endsOn: "2026-10-29", reason: "sick" as const }] };
    expect(dayOffReason("2026-10-25", off)).toBe("weekly");
    expect(dayOffReason("2026-10-28", off)).toBe("sick");
    expect(dayOffReason("2026-10-30", off)).toBeNull();
  });
});

describe("постоянные выходные", () => {
  it("по умолчанию воскресенье закрыто для клиента, но тренер может записать", async () => {
    await expect(clientBook("2026-10-25")).rejects.toSatisfy(code("CONFLICT"));
    await expect(trainerBook("2026-10-25")).resolves.toBeTruthy();
    const s = await clientBook("2026-10-24");
    await expect(rescheduleSession(client, s.id, { date: "2026-10-25", time: "12:00" }, NOW)).rejects.toThrow("выходной");
  });

  it("выходные настраиваются; хотя бы один день должен быть рабочим", async () => {
    await setWeeklyDaysOff(trainer, ["6", "7"]);
    await expect(clientBook("2026-10-24")).rejects.toSatisfy(code("CONFLICT"));
    await setWeeklyDaysOff(trainer, []);
    await expect(clientBook("2026-10-25")).resolves.toBeTruthy();
    await expect(setWeeklyDaysOff(trainer, ["1", "2", "3", "4", "5", "6", "7"])).rejects.toThrow("рабочим");
    await expect(setWeeklyDaysOff(client, ["7"])).rejects.toSatisfy(code("FORBIDDEN"));
  });
});

describe("больничный / отпуск", () => {
  it("отменяет будущие занятия в эти дни, предупреждает клиентов и закрывает запись", async () => {
    const other = await makeClient(trainer);
    const inRange = await trainerBook("2026-10-27", "10:00");
    const inRange2 = await trainerBook("2026-10-28", "18:00", other);
    const outside = await trainerBook("2026-10-30", "10:00");
    const { cancelled } = await createTimeOff(trainer, { startsOn: "2026-10-27", endsOn: "2026-10-28", reason: "sick" }, NOW);
    expect(cancelled).toBe(2);
    const st = async (id: string) => (await prisma.session.findUniqueOrThrow({ where: { id } })).status;
    expect(await st(inRange.id)).toBe("CANCELLED");
    expect(await st(inRange2.id)).toBe("CANCELLED");
    expect(await st(outside.id)).toBe("SCHEDULED");
    await drainPush();
    const n = await prisma.notification.findFirstOrThrow({ where: { userId: other.userId, type: "session_cancelled" } });
    expect(n.body).toContain("Тренер заболел");
    await expect(clientBook("2026-10-28", "12:00")).rejects.toThrow("не работает");
  });

  it("уже начавшееся занятие не отменяется; после удаления периода запись снова открыта", async () => {
    const started = await trainerBook("2026-10-27", "10:00");
    const now = moscowLocalToDate("2026-10-27", "10:30");
    const { period, cancelled } = await createTimeOff(trainer, { startsOn: "2026-10-27", endsOn: "2026-10-27", reason: "other" }, now);
    expect(cancelled).toBe(0);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: started.id } })).status).toBe("SCHEDULED");
    await deleteTimeOff(trainer, period.id);
    await expect(clientBook("2026-10-28", "14:00", now)).resolves.toBeTruthy();
  });

  it("прошедшие даты и неверный порядок дат отклоняются", async () => {
    await expect(createTimeOff(trainer, { startsOn: "2026-10-01", endsOn: "2026-10-02", reason: "vacation" }, NOW)).rejects.toSatisfy(code("VALIDATION"));
    await expect(createTimeOff(trainer, { startsOn: "2026-10-28", endsOn: "2026-10-27", reason: "vacation" }, NOW)).rejects.toThrow("раньше");
  });
});

describe("самочувствие после тренировки", () => {
  async function completed(endedMinutesAgo: number, now: Date) {
    const ex = await createExercise(trainer, { name: `Жим ${Math.random()}` });
    const start = new Date(now.getTime() - endedMinutesAgo * M - 90 * M);
    const s = await prisma.session.create({
      data: { trainerId: trainer.trainerId, clientId: client.clientId, startsAt: start, endsAt: new Date(start.getTime() + 90 * M), createdById: trainer.userId },
    });
    await saveSessionResults(trainer, s.id, { notes: "", sets: [{ exerciseId: ex.id, weightKg: "50", reps: "10" }] }, new Date(start.getTime() + 80 * M));
    return s;
  }
  const NOW2 = moscowLocalToDate("2026-10-27", "20:00");

  it("вопрос уходит через 30 минут после окончания и только один раз", async () => {
    const s = await completed(10, NOW2); // закончилась 10 минут назад — рано
    expect(await runFeedbackRequests(NOW2)).toBe(0);
    const later = new Date(NOW2.getTime() + 25 * M);
    expect(await runFeedbackRequests(later)).toBe(1);
    expect(await runFeedbackRequests(later)).toBe(0);
    await drainPush();
    const n = await prisma.notification.findFirstOrThrow({ where: { userId: client.userId, type: "feedback" } });
    expect(n.url).toBe(`/client/sessions/${s.id}/feedback`);
  });

  it("«отлично» тренера не беспокоит, «тяжело» и комментарий — приходят тренеру", async () => {
    const s = await completed(40, NOW2);
    expect((await pendingFeedback(client.clientId, NOW2))?.id).toBe(s.id);
    await saveFeedback(client, s.id, { mood: "3" }, NOW2);
    expect(await pendingFeedback(client.clientId, NOW2)).toBeNull();
    await drainPush();
    expect(await prisma.notification.count({ where: { userId: trainer.userId, type: "feedback" } })).toBe(0);
    await saveFeedbackNote(client, s.id, { note: "Немного ноет колено" }, NOW2);
    await saveFeedback(client, s.id, { mood: "1" }, NOW2);
    await drainPush();
    const n = await prisma.notification.findFirstOrThrow({ where: { userId: trainer.userId, type: "feedback" } });
    expect(n.title).toContain("тяжело");
    const row = await prisma.session.findUniqueOrThrow({ where: { id: s.id } });
    expect([row.feedbackMood, row.feedbackNote]).toEqual([1, "Немного ноет колено"]);
  });

  it("отвечает только сам клиент и только о проведённой тренировке", async () => {
    const s = await completed(40, NOW2);
    const other = await makeClient(trainer);
    await expect(saveFeedback(other, s.id, { mood: "3" })).rejects.toSatisfy(code("NOT_FOUND"));
    await expect(saveFeedback(trainer, s.id, { mood: "3" })).rejects.toSatisfy(code("FORBIDDEN"));
    await expect(saveFeedback(client, s.id, { mood: "5" })).rejects.toThrow("самочувствие");
    const future = await trainerBook("2026-10-30");
    await expect(saveFeedback(client, future.id, { mood: "3" })).rejects.toSatisfy(code("CONFLICT"));
  });
});

describe("уведомления клиентов", () => {
  it("тренер видит, у кого включены уведомления", async () => {
    await prisma.pushSubscription.create({ data: { userId: client.userId, endpoint: "https://push.example/1", p256dh: "k", auth: "a" } });
    const other = await makeClient(trainer);
    const list = await listClients(trainer);
    const byId = Object.fromEntries(list.map((c) => [c.id, c.user._count.pushSubscriptions]));
    expect(byId[client.clientId]).toBe(1);
    expect(byId[other.clientId]).toBe(0);
  });
});
