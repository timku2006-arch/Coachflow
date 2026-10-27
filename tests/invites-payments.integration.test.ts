import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { setPushSender } from "@/server/push";
import { drainPush } from "@/server/services/notifications";
import { createClient } from "@/server/services/clients";
import { acceptInvite, findInvite, issueInvite } from "@/server/services/invites";
import { clientBalance, listDebts, markSessionsPaid, monthMoney, setSessionPrice } from "@/server/services/payments";
import { createMembership } from "@/server/services/memberships";
import { saveSessionResults } from "@/server/services/sessions";
import { createExercise } from "@/server/services/exercises";
import { AppError } from "@/server/errors";
import { rub } from "@/lib/money";
import { makeClient, makeTrainer, resetDb } from "./helpers";
import type { ClientActor, TrainerActor } from "@/server/actor";

const D = 86_400_000;
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

describe("ссылка-приглашение", () => {
  it("клиент без пароля получает ссылку, задаёт пароль и ссылка гаснет", async () => {
    const u = await createClient(trainer, { name: "Анна Смирнова", email: "anna@test.local" });
    expect(u.inviteToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect((await findInvite(u.inviteToken!))?.email).toBe("anna@test.local");
    await expect(acceptInvite(u.inviteToken!, { password: "secret12", confirmPassword: "secret13" })).rejects.toThrow("не совпадают");
    await acceptInvite(u.inviteToken!, { password: "secret12", confirmPassword: "secret12" });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await bcrypt.compare("secret12", after.passwordHash)).toBe(true);
    expect([after.inviteToken, after.mustChangePassword]).toEqual([null, false]);
    // второй раз та же ссылка не работает
    await expect(acceptInvite(u.inviteToken!, { password: "another1", confirmPassword: "another1" })).rejects.toSatisfy(code("NOT_FOUND"));
  });

  it("с временным паролем — как раньше, без ссылки", async () => {
    const u = await createClient(trainer, { name: "Иван", email: "ivan@test.local", password: "temp1234" });
    expect(u.inviteToken).toBeNull();
    expect(u.mustChangePassword).toBe(true);
  });

  it("ссылка действует 7 дней; новая ссылка отменяет старую (если клиент забыл пароль)", async () => {
    const now = new Date("2026-10-20T10:00:00Z");
    const first = await issueInvite(trainer, client.clientId, now);
    expect(await findInvite(first.inviteToken, new Date(now.getTime() + 6 * D))).not.toBeNull();
    expect(await findInvite(first.inviteToken, new Date(now.getTime() + 8 * D))).toBeNull();
    const second = await issueInvite(trainer, client.clientId, now);
    expect(await findInvite(first.inviteToken, now)).toBeNull();
    await acceptInvite(second.inviteToken, { password: "newpass1", confirmPassword: "newpass1" }, now);
  });

  it("ссылку выдаёт только свой тренер; мусорные токены не принимаются", async () => {
    const stranger = await makeTrainer();
    await expect(issueInvite(stranger, client.clientId)).rejects.toSatisfy(code("NOT_FOUND"));
    await expect(issueInvite(client, client.clientId)).rejects.toSatisfy(code("FORBIDDEN"));
    expect(await findInvite("x")).toBeNull();
    expect(await findInvite("' OR 1=1 --")).toBeNull();
  });
});

describe("оплата разовых тренировок", () => {
  let n = 0;
  async function completedSession(c: ClientActor, daysAgo: number) {
    const ex = await createExercise(trainer, { name: `Упр ${++n}` });
    const startsAt = new Date(Date.now() - daysAgo * D - n * 3 * 3_600_000);
    const s = await prisma.session.create({
      data: { trainerId: trainer.trainerId, clientId: c.clientId, startsAt, endsAt: new Date(startsAt.getTime() + 90 * 60_000), createdById: trainer.userId },
    });
    await saveSessionResults(trainer, s.id, { notes: "", sets: [{ exerciseId: ex.id, weightKg: "40", reps: "10" }] }, new Date(startsAt.getTime() + 60 * 60_000));
    return s;
  }

  it("без абонемента тренировки копятся к оплате; «Получил перевод» закрывает долг и благодарит клиента", async () => {
    await setSessionPrice(trainer, { sessionPriceRub: "2000" });
    await completedSession(client, 3);
    await completedSession(client, 2);
    const b = await clientBalance(client, client.clientId);
    expect([b.count, b.total]).toEqual([2, 4000]);
    const debts = await listDebts(trainer);
    expect(debts).toMatchObject([{ clientId: client.clientId, count: 2, total: 4000 }]);
    const paid = await markSessionsPaid(trainer, client.clientId);
    expect(paid).toEqual({ count: 2, total: 4000 });
    expect((await clientBalance(trainer, client.clientId)).count).toBe(0);
    await expect(markSessionsPaid(trainer, client.clientId)).rejects.toSatisfy(code("CONFLICT"));
    await drainPush();
    const note = await prisma.notification.findFirstOrThrow({ where: { userId: client.userId, title: { contains: "Оплата получена" } } });
    expect(note.body).toBe(`2 тренировки — ${rub(4000)}`);
  });

  it("занятия, списанные с абонемента, не считаются долгом", async () => {
    await setSessionPrice(trainer, { sessionPriceRub: "2000" });
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" });
    const from = new Date(Date.now() - 10 * D).toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" });
    await createMembership(trainer, client.clientId, { totalSessions: "1", validFrom: from, validUntil: today, paid: "on", priceRub: "15000" });
    await completedSession(client, 2); // спишется с абонемента
    await completedSession(client, 1); // абонемент закончился — разовая
    expect((await clientBalance(trainer, client.clientId)).count).toBe(1);
  });

  it("деньги за месяц: получено и ожидается", async () => {
    await setSessionPrice(trainer, { sessionPriceRub: "1500" });
    const other = await makeClient(trainer);
    await completedSession(client, 1);
    await completedSession(other, 1);
    await markSessionsPaid(trainer, client.clientId);
    const now = new Date();
    const m = await monthMoney(trainer, new Date(now.getTime() - 40 * D), new Date(now.getTime() + D));
    expect([m.received, m.expected, m.unpaidSingles]).toEqual([1500, 1500, 1]);
  });

  it("без цены — считаем тренировки, сумму не придумываем; чужому тренеру и клиенту отметить оплату нельзя", async () => {
    await completedSession(client, 1);
    const b = await clientBalance(trainer, client.clientId);
    expect([b.count, b.total]).toEqual([1, null]);
    const stranger = await makeTrainer();
    await expect(markSessionsPaid(stranger, client.clientId)).rejects.toSatisfy(code("NOT_FOUND"));
    await expect(markSessionsPaid(client, client.clientId)).rejects.toSatisfy(code("FORBIDDEN"));
    await expect(setSessionPrice(trainer, { sessionPriceRub: "-5" })).rejects.toThrow("отрицательной");
  });
});
