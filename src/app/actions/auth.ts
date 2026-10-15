"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { endSession, hashPassword, requireUser, startSession, verifyPassword } from "@/server/auth";
import { AppError } from "@/server/errors";
import { formObject, handle, type FormState } from "@/server/action";
import { changePasswordSchema, loginSchema, registerTrainerSchema } from "@/lib/validation";
import { homeFor } from "@/server/session-token";

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { email, password } = loginSchema.parse(formObject(fd));
    const user = await prisma.user.findUnique({ where: { email } });
    // Одинаковое сообщение для «нет пользователя» и «неверный пароль».
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError("UNAUTHORIZED", "Неверный email или пароль");
    }
    await startSession(user.id, user.role);
    redirect(user.mustChangePassword ? "/change-password" : homeFor(user.role));
  });
}

/** Регистрация тренера. В приложении один тренер — после него регистрация закрыта. */
export async function registerTrainerAction(_: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const data = registerTrainerSchema.parse(formObject(fd));
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.$transaction(
      async (tx) => {
        if ((await tx.trainerProfile.count()) > 0) {
          throw new AppError("FORBIDDEN", "Тренер уже зарегистрирован. Войдите в аккаунт.");
        }
        if (await tx.user.findUnique({ where: { email: data.email } })) {
          throw new AppError("CONFLICT", "Пользователь с таким email уже существует");
        }
        return tx.user.create({
          data: { email: data.email, name: data.name, passwordHash, role: "TRAINER", trainerProfile: { create: {} } },
        });
      },
      { isolationLevel: "Serializable" },
    );
    await startSession(user.id, "TRAINER");
    redirect("/trainer/profile?welcome=1");
  });
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const user = await requireUser();
    const data = changePasswordSchema.parse(formObject(fd));
    if (!(await verifyPassword(data.currentPassword, user.passwordHash))) {
      throw new AppError("VALIDATION", "Текущий пароль указан неверно");
    }
    if (data.currentPassword === data.newPassword) {
      throw new AppError("VALIDATION", "Новый пароль должен отличаться от текущего");
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(data.newPassword), mustChangePassword: false },
    });
    redirect(homeFor(user.role));
  });
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}
