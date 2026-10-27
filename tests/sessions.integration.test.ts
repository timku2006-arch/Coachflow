import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  cancelSession,
  createSession,
  getSession,
  listWeek,
  rescheduleSession,
  saveSessionResults,
} from "@/server/services/sessions";
import { createExercise } from "@/server/services/exercises";
import { AppError } from "@/server/errors";
import { moscowLocalToDate, moscowWeekStart } from "@/lib/time";
import { makeClient, makeTrainer, resetDb } from "./helpers";
import type { ClientActor, TrainerActor } from "@/server/actor";

const H = 3_600_000;
const M = 60_000;
// Занятие 20.10.2026 в 18:00 МСК
const START = moscowLocalToDate("2026-10-20", "18:00");
const at = (msBeforeStart: number) => new Date(START.getTime() - msBeforeStart);
const LONG_BEFORE = at(48 * H);

let trainer: TrainerActor;
let client: ClientActor;
let otherClient: ClientActor;

async function expectCode(p: Promise<unknown>, code: AppError["code"]) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
}

async function book(actor: TrainerActor | ClientActor = trainer, clientId = client.clientId, time = "18:00") {
  return createSession(actor, { clientId, date: "2026-10-20", time }, LONG_BEFORE);
}

beforeEach(async () => {
  await resetDb();
  trainer = await makeTrainer();
  client = await makeClient(trainer);
  otherClient = await makeClient(trainer);
});
afterAll(() => prisma.$disconnect());

describe("окно в 3 часа проверяется на сервере (клиент)", () => {
  it("отмена: ровно 3:00 — TOO_LATE", async () => {
    const s = await book();
    await expectCode(cancelSession(client, s.id, at(3 * H)), "TOO_LATE");
    expect((await prisma.session.findUnique({ where: { id: s.id } }))!.status).toBe("SCHEDULED");
  });
  it("отмена: 2:59 — TOO_LATE", async () => {
    const s = await book();
    await expectCode(cancelSession(client, s.id, at(3 * H - M)), "TOO_LATE");
  });
  it("отмена: 3:01 — успешно", async () => {
    const s = await book();
    const res = await cancelSession(client, s.id, at(3 * H + M));
    expect(res.status).toBe("CANCELLED");
    expect(res.cancelledById).toBe(client.userId);
  });
  it("перенос: ровно 3:00 и 2:59 — TOO_LATE, 3:01 — успешно", async () => {
    const s = await book();
    const target = { date: "2026-10-22", time: "12:00" };
    await expectCode(rescheduleSession(client, s.id, target, at(3 * H)), "TOO_LATE");
    await expectCode(rescheduleSession(client, s.id, target, at(3 * H - M)), "TOO_LATE");
    const moved = await rescheduleSession(client, s.id, target, at(3 * H + M));
    expect(moved.startsAt.toISOString()).toBe("2026-10-22T09:00:00.000Z");
    expect(moved.endsAt.toISOString()).toBe("2026-10-22T10:30:00.000Z"); // 90 минут
  });
  it("клиент не может перенести занятие на время ближе 3 часов", async () => {
    const s = await book();
    // сейчас 20.10 08:00 МСК, переносим на 11:00 того же дня — ровно 3 часа
    await expectCode(rescheduleSession(client, s.id, { date: "2026-10-20", time: "11:00" }, at(10 * H)), "TOO_LATE");
  });
  it("клиент не может записаться менее чем за 3 часа", async () => {
    await expectCode(createSession(client, { date: "2026-10-20", time: "18:00" }, at(3 * H)), "TOO_LATE");
    const s = await createSession(client, { date: "2026-10-20", time: "18:00" }, at(3 * H + M));
    expect(s.clientId).toBe(client.clientId);
    expect(s.createdById).toBe(client.userId);
  });
});

describe("для тренера ограничения нет", () => {
  it("тренер отменяет и переносит за 10 минут до начала", async () => {
    const s = await book();
    const moved = await rescheduleSession(trainer, s.id, { date: "2026-10-20", time: "19:00" }, at(10 * M));
    expect(moved.startsAt.toISOString()).toBe("2026-10-20T16:00:00.000Z");
    const cancelled = await cancelSession(trainer, s.id, at(5 * M));
    expect(cancelled.status).toBe("CANCELLED");
  });
});

describe("пересечения в расписании тренера", () => {
  it("нельзя записать двоих на пересекающееся время", async () => {
    await book();
    await expectCode(book(trainer, otherClient.clientId, "19:00"), "CONFLICT"); // 18:00–19:30 vs 19:00
    const ok = await book(trainer, otherClient.clientId, "19:30"); // встык — можно
    expect(ok.id).toBeTruthy();
  });
  it("после отмены слот освобождается", async () => {
    const s = await book();
    await cancelSession(trainer, s.id, LONG_BEFORE);
    expect((await book(trainer, otherClient.clientId)).id).toBeTruthy();
  });
  it("ограничение БД срабатывает даже в обход проверки сервиса", async () => {
    await book();
    await expect(
      prisma.session.create({
        data: {
          trainerId: trainer.trainerId,
          clientId: otherClient.clientId,
          startsAt: new Date(START.getTime() + 30 * M),
          endsAt: new Date(START.getTime() + 120 * M),
          createdById: trainer.userId,
        },
      }),
    ).rejects.toThrow(/Session_no_overlap|23P01|constraint/);
  });
  it("одновременные записи на одно время: проходит только одна", async () => {
    const results = await Promise.allSettled([
      book(trainer, client.clientId),
      book(trainer, otherClient.clientId),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
});

describe("права доступа", () => {
  it("клиент не видит и не меняет чужие записи", async () => {
    const s = await book(trainer, otherClient.clientId);
    await expectCode(getSession(client, s.id), "NOT_FOUND");
    await expectCode(cancelSession(client, s.id, LONG_BEFORE), "NOT_FOUND");
    await expectCode(rescheduleSession(client, s.id, { date: "2026-10-25", time: "10:00" }, LONG_BEFORE), "NOT_FOUND");
  });
  it("клиент не может записать другого клиента", async () => {
    await expectCode(
      createSession(client, { clientId: otherClient.clientId, date: "2026-10-20", time: "18:00" }, LONG_BEFORE),
      "NOT_FOUND",
    );
  });
  it("чужой тренер не видит записи и клиентов", async () => {
    const stranger = await makeTrainer();
    const s = await book();
    await expectCode(getSession(stranger, s.id), "NOT_FOUND");
    await expectCode(cancelSession(stranger, s.id, LONG_BEFORE), "NOT_FOUND");
    await expectCode(createSession(stranger, { clientId: client.clientId, date: "2026-10-21", time: "10:00" }, LONG_BEFORE), "NOT_FOUND");
  });
  it("клиент в недельном календаре видит чужие занятия только как «занято»", async () => {
    await book(trainer, otherClient.clientId, "10:00");
    await book(trainer, client.clientId, "18:00");
    const week = await listWeek(client, moscowWeekStart(START));
    expect(week.sessions).toHaveLength(1);
    expect(week.sessions[0].clientId).toBe(client.clientId);
    expect(week.busy).toHaveLength(1);
    expect(Object.keys(week.busy[0]).sort()).toEqual(["endsAt", "startsAt"]);
  });
  it("клиент не может вносить результаты", async () => {
    const s = await book();
    await expectCode(saveSessionResults(client, s.id, { sets: [] }, at(-2 * H)), "FORBIDDEN");
  });
});

describe("запись → карточка результатов", () => {
  it("раньше чем за 15 минут до начала результаты внести нельзя, после — можно, статус COMPLETED", async () => {
    const s = await book();
    const bench = await createExercise(trainer, { name: "Жим лёжа" });
    const squat = await createExercise(trainer, { name: "Присед" });
    const input = {
      notes: "Хорошая техника",
      sets: [
        { exerciseId: bench.id, weightKg: "60", reps: "10" },
        { exerciseId: bench.id, weightKg: 65, reps: 8 },
        { exerciseId: squat.id, weightKg: 80, reps: 6 },
      ],
    };
    await expectCode(saveSessionResults(trainer, s.id, input, at(16 * M)), "CONFLICT");
    await saveSessionResults(trainer, s.id, input, at(-2 * H));
    const full = await getSession(client, s.id, at(-2 * H));
    expect(full.status).toBe("COMPLETED");
    expect(full.phase).toBe("completed");
    expect(full.notes).toBe("Хорошая техника");
    expect(full.results.map((r) => [r.exercise.name, r.setNumber, r.weightKg, r.reps])).toEqual(
      expect.arrayContaining([
        ["Жим лёжа", 1, 60, 10],
        ["Жим лёжа", 2, 65, 8],
        ["Присед", 1, 80, 6],
      ]),
    );
  });
  it("отклоняет некорректные подходы и чужие упражнения", async () => {
    const s = await book();
    const stranger = await makeTrainer();
    const foreign = await createExercise(stranger, { name: "Тяга" });
    await expect(
      saveSessionResults(trainer, s.id, { sets: [{ exerciseId: foreign.id, weightKg: 50, reps: 5 }] }, at(-2 * H)),
    ).rejects.toThrow(/неизвестное упражнение/);
    const own = await createExercise(trainer, { name: "Тяга" });
    await expect(
      saveSessionResults(trainer, s.id, { sets: [{ exerciseId: own.id, weightKg: -5, reps: 0 }] }, at(-2 * H)),
    ).rejects.toThrow();
  });
});
