"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor, requireUser } from "@/server/auth";
import { handle, type FormState } from "@/server/action";
import { drainPush, markAllRead, notify, removePushSubscription, savePushSubscription } from "@/server/services/notifications";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";

/** Сохранить подписку этого устройства на push. */
export async function savePushSubscriptionAction(subscription: unknown): Promise<FormState> {
  return handle(async () => {
    const user = await requireUser();
    await savePushSubscription(user.id, subscription, (await headers()).get("user-agent"));
  });
}

export async function removePushSubscriptionAction(endpoint: string): Promise<FormState> {
  return handle(async () => {
    const user = await requireUser();
    if (typeof endpoint === "string" && endpoint.length < 2048) await removePushSubscription(user.id, endpoint);
  });
}

/** Тестовое уведомление на все устройства пользователя. */
export async function sendTestPushAction(): Promise<FormState> {
  return handle(async () => {
    const { user } = await requireActor();
    const devices = await prisma.pushSubscription.count({ where: { userId: user.id } });
    if (devices === 0) throw new AppError("VALIDATION", "Уведомления на этом устройстве ещё не включены");
    await notify([user.id], { type: "test", title: "Уведомления работают 🎉", body: "Так будут выглядеть напоминания и новости о тренировках." });
    await drainPush();
    revalidatePath("/", "layout");
    return "Тестовое уведомление отправлено";
  });
}

export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  await markAllRead(user.id);
  revalidatePath("/", "layout");
}
