// Web Push: ключи VAPID и отправка уведомлений на устройства.
// Ключи берутся из переменных окружения VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY,
// а если их нет — генерируются один раз и сохраняются в БД (AppSetting),
// чтобы подписки не «ломались» после перезапуска.
import webpush from "web-push";
import { prisma } from "./db";

export type PushAction = { action: string; title: string };
export type PushPayload = { title: string; body: string; url?: string; tag?: string; badge?: number; actions?: PushAction[]; sessionId?: string };
export type PushTarget = { endpoint: string; p256dh: string; auth: string };
/** Результат отправки: gone — подписка больше не действует (удалить). */
export type PushResult = "ok" | "gone" | "error";
export type PushSender = (target: PushTarget, payload: PushPayload) => Promise<PushResult>;

type Vapid = { publicKey: string; privateKey: string; subject: string };
let cached: Vapid | null = null;

export async function getVapid(): Promise<Vapid> {
  if (cached) return cached;
  const subject = process.env.VAPID_SUBJECT || "mailto:push@coachflow.ru";
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cached = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY, subject };
    return cached;
  }
  const existing = await prisma.appSetting.findUnique({ where: { key: "vapid" } });
  if (existing) {
    cached = { ...(JSON.parse(existing.value) as { publicKey: string; privateKey: string }), subject };
    return cached;
  }
  const keys = webpush.generateVAPIDKeys();
  // Если параллельно ключи уже создал другой процесс — берём сохранённые.
  await prisma.appSetting.createMany({ data: [{ key: "vapid", value: JSON.stringify(keys) }], skipDuplicates: true });
  const saved = await prisma.appSetting.findUniqueOrThrow({ where: { key: "vapid" } });
  cached = { ...(JSON.parse(saved.value) as { publicKey: string; privateKey: string }), subject };
  return cached;
}

const webPushSender: PushSender = async (target, payload) => {
  const vapid = await getVapid();
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { vapidDetails: vapid, TTL: 60 * 60 * 12, urgency: "high", timeout: 10_000 },
    );
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("[push] ошибка отправки", status ?? "", (e as Error).message);
    return "error";
  }
};

let sender: PushSender = webPushSender;

/** Для тестов: подменить способ отправки. */
export function setPushSender(s: PushSender | null) {
  sender = s ?? webPushSender;
}

export function getPushSender(): PushSender {
  return sender;
}
