// Ссылка-приглашение: клиент открывает её и сам придумывает пароль.
// Токен случайный (192 бита), одноразовый, действует 7 дней. Новая ссылка отменяет старую.
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertClientAccess, assertTrainer } from "../access";
import { AppError } from "../errors";
import { setPasswordSchema } from "@/lib/validation";

export const INVITE_TTL_DAYS = 7;
const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

export function newInvite(now: Date = new Date()) {
  return { inviteToken: randomBytes(24).toString("base64url"), inviteExpiresAt: new Date(now.getTime() + INVITE_TTL_DAYS * 86_400_000) };
}

/** Новая ссылка для входа (первый вход или клиент забыл пароль). Старая перестаёт работать. */
export async function issueInvite(actor: Actor, clientId: string, now: Date = new Date()) {
  assertTrainer(actor);
  await assertClientAccess(prisma, actor, clientId);
  const { userId } = await prisma.clientProfile.findUniqueOrThrow({ where: { id: clientId }, select: { userId: true } });
  const invite = newInvite(now);
  await prisma.user.update({ where: { id: userId }, data: invite });
  return invite;
}

/** Кому принадлежит действующая ссылка (для страницы приглашения), иначе null. */
export async function findInvite(token: string, now: Date = new Date()) {
  if (!TOKEN_RE.test(token)) return null;
  const user = await prisma.user.findUnique({ where: { inviteToken: token }, select: { id: true, name: true, email: true, role: true, inviteExpiresAt: true } });
  if (!user || user.role !== "CLIENT" || !user.inviteExpiresAt || user.inviteExpiresAt <= now) return null;
  return user;
}

/** Клиент задал пароль по ссылке. Ссылка после этого не работает. */
export async function acceptInvite(token: string, input: unknown, now: Date = new Date()) {
  const { password } = setPasswordSchema.parse(input);
  const user = await findInvite(token, now);
  if (!user) throw new AppError("NOT_FOUND", "Ссылка устарела или уже использована. Попросите тренера прислать новую.");
  const passwordHash = await bcrypt.hash(password, 10);
  // Атомарно «гасим» ссылку: если её уже использовали параллельно — второй раз не сработает.
  const done = await prisma.user.updateMany({
    where: { id: user.id, inviteToken: token, inviteExpiresAt: { gt: now } },
    data: { passwordHash, mustChangePassword: false, inviteToken: null, inviteExpiresAt: null },
  });
  if (done.count !== 1) throw new AppError("NOT_FOUND", "Ссылка устарела или уже использована. Попросите тренера прислать новую.");
  return user;
}
