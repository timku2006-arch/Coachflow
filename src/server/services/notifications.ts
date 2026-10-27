import { z } from "zod";
import { prisma } from "../db";
import { getPushSender, getVapid, type PushAction, type PushPayload } from "../push";

export type NotificationType =
  | "session_booked"
  | "session_rescheduled"
  | "session_cancelled"
  | "session_reminder"
  | "results_ready"
  | "program_updated"
  | "nutrition_updated"
  | "record"
  | "achievement"
  | "membership"
  | "attendance"
  | "feedback"
  | "test";

export type NotifyInput = {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  /**
   * Схлопывать повторы: если у пользователя есть непрочитанное уведомление того же типа
   * и с той же ссылкой за последние 10 минут — обновляем его без повторного push.
   * Полезно, когда тренер несколько раз подряд правит программу.
   */
  collapse?: boolean;
  /** Кнопки в push-уведомлении (Android, компьютер; на iPhone откроется ссылка). */
  actions?: PushAction[];
  sessionId?: string;
};

const COLLAPSE_MS = 10 * 60_000;

// Отправка push не задерживает ответ пользователю: идёт в фоне.
const pending = new Set<Promise<unknown>>();

/** Дождаться фоновых отправок (для тестов и корректной остановки). */
export async function drainPush() {
  while (pending.size) await Promise.allSettled([...pending]);
}

/**
 * Создаёт уведомления в приложении и отправляет push на все устройства получателей.
 * Никогда не бросает исключение: уведомление не должно ломать основное действие.
 */
export async function notify(userIds: (string | null | undefined)[], n: NotifyInput): Promise<void> {
  const ids = [...new Set(userIds.filter((x): x is string => !!x))];
  if (ids.length === 0) return;
  try {
    const toPush: string[] = [];
    for (const userId of ids) {
      if (n.collapse) {
        const recent = await prisma.notification.findFirst({
          where: { userId, type: n.type, url: n.url ?? null, readAt: null, createdAt: { gte: new Date(Date.now() - COLLAPSE_MS) } },
          orderBy: { createdAt: "desc" },
        });
        if (recent) {
          await prisma.notification.update({ where: { id: recent.id }, data: { title: n.title, body: n.body, createdAt: new Date() } });
          continue;
        }
      }
      await prisma.notification.create({ data: { userId, type: n.type, title: n.title, body: n.body, url: n.url } });
      toPush.push(userId);
    }
    if (toPush.length) {
      const p = deliver(toPush, { title: n.title, body: n.body, url: n.url, tag: n.type, actions: n.actions, sessionId: n.sessionId }).finally(() => pending.delete(p));
      pending.add(p);
    }
  } catch (e) {
    console.error("[notify] не удалось создать уведомление", e);
  }
}

async function deliver(userIds: string[], payload: PushPayload) {
  try {
    const [subs, unread] = await Promise.all([
      prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } }),
      prisma.notification.groupBy({ by: ["userId"], where: { userId: { in: userIds }, readAt: null }, _count: true }),
    ]);
    const badge = new Map(unread.map((u) => [u.userId, u._count]));
    const send = getPushSender();
    await Promise.allSettled(
      subs.map(async (s) => {
        const res = await send(s, { ...payload, badge: badge.get(s.userId) ?? 0 });
        if (res === "gone") await prisma.pushSubscription.deleteMany({ where: { id: s.id } });
      }),
    );
  } catch (e) {
    console.error("[push] ошибка доставки", e);
  }
}

// ---------------------------------------------------------------- чтение
export async function listNotifications(userId: string, take = 50) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

// ---------------------------------------------------------------- подписки
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
});

/** Сохраняет подписку устройства. Если устройство было привязано к другому пользователю — перепривязывает. */
export async function savePushSubscription(userId: string, input: unknown, userAgent?: string | null) {
  const sub = pushSubscriptionSchema.parse(input);
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent?.slice(0, 300) },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent?.slice(0, 300) },
  });
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export async function vapidPublicKey() {
  return (await getVapid()).publicKey;
}
