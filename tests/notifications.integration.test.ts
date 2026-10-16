import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { setPushSender, type PushPayload, type PushResult, type PushTarget } from "@/server/push";
import { drainPush, listNotifications, markAllRead, notify, savePushSubscription, unreadCount, vapidPublicKey } from "@/server/services/notifications";
import { cancelSession, createSession, rescheduleSession, saveSessionResults } from "@/server/services/sessions";
import { runReminders } from "@/server/services/reminders";
import { createExercise } from "@/server/services/exercises";
import { activateProgram, createProgram, updateProgram } from "@/server/services/programs";
import { setNutritionTargets } from "@/server/services/clients";
import { moscowLocalToDate } from "@/lib/time";
import { makeClient, makeTrainer, resetDb } from "./helpers";
import type { ClientActor, TrainerActor } from "@/server/actor";

const H = 3_600_000;
const START = moscowLocalToDate("2026-10-20", "18:00");
const at = (msBefore: number) => new Date(START.getTime() - msBefore);
const LONG_BEFORE = at(48 * H);

let trainer: TrainerActor;
let client: ClientActor;
let other: ClientActor;
let sent: { target: PushTarget; payload: PushPayload }[];
let nextResult: PushResult;

const titles = async (userId: string) => (await listNotifications(userId)).map((n) => n.title);
const book = (actor: TrainerActor | ClientActor = trainer) =>
  createSession(actor, { clientId: client.clientId, date: "2026-10-20", time: "18:00" }, LONG_BEFORE);

beforeEach(async () => {
  await resetDb();
  trainer = await makeTrainer();
  client = await makeClient(trainer);
  other = await makeClient(trainer);
  sent = [];
  nextResult = "ok";
  setPushSender(async (target, payload) => {
    sent.push({ target, payload });
    return nextResult;
  });
});
afterEach(() => setPushSender(null));
afterAll(() => prisma.$disconnect());

describe("уведомления о записях", () => {
  it("клиент записался → уведомление тренеру, не клиенту", async () => {
    await book(client);
    expect(await titles(trainer.userId)).toEqual([expect.stringContaining("Новая запись")]);
    expect(await titles(client.userId)).toEqual([]);
  });
  it("тренер записал → уведомление клиенту, не тренеру", async () => {
    await book(trainer);
    expect(await titles(client.userId)).toEqual(["Вы записаны на тренировку"]);
    expect(await titles(trainer.userId)).toEqual([]);
    expect(await titles(other.userId)).toEqual([]);
  });
  it("перенос и отмена уведомляют другую сторону со ссылкой на запись", async () => {
    const s = await book(trainer);
    await rescheduleSession(client, s.id, { date: "2026-10-21", time: "10:00" }, LONG_BEFORE);
    await cancelSession(trainer, s.id, LONG_BEFORE);
    const forTrainer = await listNotifications(trainer.userId);
    expect(forTrainer[0].title).toContain("Перенос");
    expect(forTrainer[0].body).toContain("→");
    expect(forTrainer[0].url).toBe(`/trainer/sessions/${s.id}`);
    const forClient = await titles(client.userId);
    expect(forClient[0]).toBe("Тренер отменил тренировку");
  });
  it("результаты: первое сохранение — «готовы», повторное схлопывается", async () => {
    const s = await book(trainer);
    const ex = await createExercise(trainer, { name: "Присед" });
    const input = { sets: [{ exerciseId: ex.id, weightKg: 50, reps: 10 }, { exerciseId: ex.id, weightKg: 55, reps: 8 }] };
    await saveSessionResults(trainer, s.id, input, at(-2 * H));
    await saveSessionResults(trainer, s.id, input, at(-2 * H));
    const list = await listNotifications(client.userId);
    const results = list.filter((n) => n.type === "results_ready");
    expect(results).toHaveLength(1);
    expect(results[0].body).toContain("1 упражнение, 2 подхода");
  });
});

describe("программа и питание", () => {
  it("уведомляет клиента о новой и изменённой текущей программе, не о черновиках", async () => {
    const ex = await createExercise(trainer, { name: "Жим" });
    const item = { exerciseId: ex.id, sets: 3, reps: "10" };
    const active = await createProgram(trainer, client.clientId, { name: "Сила", items: [item] });
    const draft = await createProgram(trainer, client.clientId, { name: "Черновик", items: [item] }, { makeActive: false });
    await markAllRead(client.userId);
    await updateProgram(trainer, draft.id, { name: "Черновик 2", items: [item] });
    expect(await unreadCount(client.userId)).toBe(0);
    await updateProgram(trainer, active.id, { name: "Сила 2", items: [item] });
    expect((await listNotifications(client.userId))[0].title).toBe("Программа тренировок обновлена");
    await activateProgram(trainer, draft.id);
    expect((await listNotifications(client.userId))[0].body).toBe("Черновик 2");
  });
  it("питание: повторные правки за 10 минут схлопываются в одно уведомление", async () => {
    await setNutritionTargets(trainer, client.clientId, { calories: 2000, proteinG: 100, fatG: 60, carbsG: 250 });
    await setNutritionTargets(trainer, client.clientId, { calories: 2100, proteinG: 110, fatG: 60, carbsG: 250 });
    const list = await listNotifications(client.userId);
    expect(list).toHaveLength(1);
    expect(list[0].body).toContain("2100 ккал");
    await drainPush();
    expect(sent).toHaveLength(0); // у клиента нет подписок
  });
});

describe("напоминания", () => {
  it("за сутки и за 2 часа — по одному разу, клиенту и тренеру", async () => {
    const s = await book(trainer);
    await markAllRead(client.userId);
    expect(await runReminders(at(30 * H))).toBe(0); // рано
    expect(await runReminders(at(23 * H))).toBe(1);
    expect(await runReminders(at(22 * H))).toBe(0); // повторно не шлём
    expect(await runReminders(at(1.5 * H))).toBe(1);
    expect(await runReminders(at(1 * H))).toBe(0);
    expect(await runReminders(at(-1 * H))).toBe(0); // уже началось
    const c = (await listNotifications(client.userId)).filter((n) => n.type === "session_reminder");
    const t = (await listNotifications(trainer.userId)).filter((n) => n.type === "session_reminder");
    expect(c.map((n) => n.title)).toEqual(["Тренировка через 2 часа ⏰", "Напоминание о тренировке"]);
    expect(t).toHaveLength(2);
    expect(c[0].url).toBe(`/client/sessions/${s.id}`);
  });
  it("перенос сбрасывает напоминания, отменённые не напоминают", async () => {
    const s = await book(trainer);
    await runReminders(at(23 * H));
    // перенос на +3 дня: суточное напоминание снова понадобится
    await rescheduleSession(trainer, s.id, { date: "2026-10-23", time: "18:00" }, at(22 * H));
    const NEW = moscowLocalToDate("2026-10-23", "18:00");
    expect(await runReminders(new Date(NEW.getTime() - 20 * H))).toBe(1);
    await cancelSession(trainer, s.id, new Date(NEW.getTime() - 19 * H));
    expect(await runReminders(new Date(NEW.getTime() - 1 * H))).toBe(0);
  });
  it("запись меньше чем за сутки не получает суточное напоминание", async () => {
    await createSession(trainer, { clientId: client.clientId, date: "2026-10-20", time: "18:00" }, at(5 * H));
    expect(await runReminders(at(4 * H))).toBe(0);
    expect(await runReminders(at(1 * H))).toBe(1);
  });
});

describe("push", () => {
  const sub = (n: number) => ({ endpoint: `https://push.example.com/${n}`, keys: { p256dh: "BPk", auth: "au" } });

  it("отправляет на все устройства получателя с бейджем непрочитанных; 410 удаляет подписку", async () => {
    await savePushSubscription(client.userId, sub(1));
    await savePushSubscription(client.userId, sub(2));
    await savePushSubscription(other.userId, sub(3));
    nextResult = "gone";
    await book(trainer);
    await drainPush();
    expect(sent.map((x) => x.target.endpoint).sort()).toEqual(["https://push.example.com/1", "https://push.example.com/2"]);
    expect(sent[0].payload).toMatchObject({ title: "Вы записаны на тренировку", badge: 1 });
    expect(await prisma.pushSubscription.count({ where: { userId: client.userId } })).toBe(0);
    expect(await prisma.pushSubscription.count({ where: { userId: other.userId } })).toBe(1);
  });
  it("устройство перепривязывается к новому пользователю; кривые подписки отклоняются", async () => {
    await savePushSubscription(client.userId, sub(1));
    await savePushSubscription(other.userId, sub(1));
    expect(await prisma.pushSubscription.findMany({ select: { userId: true } })).toEqual([{ userId: other.userId }]);
    await expect(savePushSubscription(client.userId, { endpoint: "http://insecure", keys: { p256dh: "a", auth: "b" } })).rejects.toThrow();
    await expect(savePushSubscription(client.userId, { endpoint: "https://x.y/z" })).rejects.toThrow();
  });
  it("ключи VAPID создаются один раз и сохраняются", async () => {
    const k1 = await vapidPublicKey();
    expect(k1).toMatch(/^[A-Za-z0-9_-]{80,}$/);
    expect(await prisma.appSetting.count()).toBe(1);
  });
  it("ошибка уведомления не ломает основное действие", async () => {
    setPushSender(async () => {
      throw new Error("сеть упала");
    });
    await savePushSubscription(client.userId, sub(1));
    const s = await book(trainer);
    await drainPush();
    expect(s.id).toBeTruthy();
    await notify([null, undefined], { type: "test", title: "x", body: "y" }); // пустые получатели — без ошибок
  });
});
