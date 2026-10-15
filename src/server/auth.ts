import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession, homeFor } from "./session-token";
import type { Actor, ClientActor, TrainerActor } from "./actor";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function startSession(userId: string, role: "TRAINER" | "CLIENT") {
  const token = await signSession({ userId, role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Текущий пользователь (из cookie, с проверкой в БД) или null. Кэшируется на запрос. */
export const getCurrentUser = cache(async () => {
  const payload = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { trainerProfile: true, clientProfile: true },
  });
  if (!user || user.role !== payload.role) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function toActor(user: CurrentUser): Actor {
  if (user.role === "TRAINER") {
    if (!user.trainerProfile) throw new Error("Профиль тренера не найден");
    return { role: "TRAINER", userId: user.id, trainerId: user.trainerProfile.id };
  }
  if (!user.clientProfile) throw new Error("Профиль клиента не найден");
  return {
    role: "CLIENT",
    userId: user.id,
    clientId: user.clientProfile.id,
    trainerId: user.clientProfile.trainerId,
  };
}

/** Любой вошедший пользователь (без проверки обязательной смены пароля). */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

async function requireRole(role: "TRAINER" | "CLIENT") {
  const user = await requireUser();
  if (user.role !== role) redirect(homeFor(user.role));
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}

export async function requireTrainer(): Promise<{ user: CurrentUser; actor: TrainerActor }> {
  const user = await requireRole("TRAINER");
  return { user, actor: toActor(user) as TrainerActor };
}

export async function requireClient(): Promise<{ user: CurrentUser; actor: ClientActor }> {
  const user = await requireRole("CLIENT");
  return { user, actor: toActor(user) as ClientActor };
}

/** Для общих страниц (например, карточка записи), доступных обеим ролям. */
export async function requireActor(): Promise<{ user: CurrentUser; actor: Actor }> {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/change-password");
  return { user, actor: toActor(user) };
}
