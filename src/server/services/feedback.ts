// Самочувствие после тренировки: вопрос клиенту и ответ тренеру.
import { prisma } from "../db";
import type { Actor } from "../actor";
import { AppError, notFound } from "../errors";
import { assertClientAccess } from "../access";
import { feedbackNoteSchema, feedbackSchema } from "@/lib/validation";
import { FEEDBACK_DELAY_MIN, FEEDBACK_WINDOW_DAYS, moodOf, needsTrainerAttention } from "@/lib/feedback";
import { formatDayMonth, relativeDayLabel } from "@/lib/time";
import { notify } from "./notifications";

const MIN = 60_000;

/**
 * Раз в минуту: проведённым тренировкам, закончившимся 30+ минут назад (но не больше суток),
 * отправляем клиенту вопрос «Как самочувствие?». Ровно один раз на тренировку.
 */
export async function runFeedbackRequests(now: Date = new Date()): Promise<number> {
  const due = await prisma.session.findMany({
    where: {
      status: "COMPLETED",
      feedbackAskedAt: null,
      feedbackMood: null,
      endsAt: { lte: new Date(now.getTime() - FEEDBACK_DELAY_MIN * MIN), gte: new Date(now.getTime() - 24 * 60 * MIN) },
    },
    include: { client: { select: { userId: true } } },
    take: 200,
  });
  let sent = 0;
  for (const s of due) {
    const claimed = await prisma.session.updateMany({ where: { id: s.id, feedbackAskedAt: null }, data: { feedbackAskedAt: now } });
    if (claimed.count !== 1) continue;
    await notify([s.client.userId], {
      type: "feedback",
      title: "Как самочувствие после тренировки?",
      body: "Ответьте одним нажатием — тренеру важно знать.",
      url: `/client/sessions/${s.id}/feedback`,
    });
    sent++;
  }
  return sent;
}

/** Проведённая тренировка клиента, о которой он ещё не рассказал (за последние 3 дня). */
export async function pendingFeedback(clientId: string, now: Date = new Date()) {
  return prisma.session.findFirst({
    where: {
      clientId,
      status: "COMPLETED",
      feedbackMood: null,
      endsAt: { lte: now, gte: new Date(now.getTime() - FEEDBACK_WINDOW_DAYS * 24 * 60 * MIN) },
    },
    orderBy: { startsAt: "desc" },
    select: { id: true, startsAt: true },
  });
}

async function ownCompleted(actor: Actor, sessionId: string) {
  if (actor.role !== "CLIENT") throw new AppError("FORBIDDEN", "Самочувствие отмечает клиент");
  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { client: { select: { user: { select: { name: true } } } }, trainer: { select: { userId: true } } },
  });
  if (!s || s.clientId !== actor.clientId) throw notFound("Тренировка");
  if (s.status !== "COMPLETED") throw new AppError("CONFLICT", "Тренировка ещё не проведена");
  return s;
}

async function tellTrainer(s: Awaited<ReturnType<typeof ownCompleted>>, mood: number, note: string | null) {
  if (!needsTrainerAttention(mood, note)) return;
  const m = moodOf(mood)!;
  await notify([s.trainer.userId], {
    type: "feedback",
    title: `${s.client.user.name}: ${m.emoji} ${m.label.toLowerCase()}`,
    body: note ? `«${note}»` : `После тренировки ${relativeDayLabel(s.startsAt).toLowerCase()}, ${formatDayMonth(s.startsAt)}`,
    url: `/trainer/sessions/${s.id}`,
    collapse: true,
  });
}

/** Клиент выбрал самочувствие (можно передумать). */
export async function saveFeedback(actor: Actor, sessionId: string, input: unknown, now: Date = new Date()) {
  const s = await ownCompleted(actor, sessionId);
  const { mood, note } = feedbackSchema.parse(input);
  const nextNote = note ?? s.feedbackNote;
  const updated = await prisma.session.update({
    where: { id: s.id },
    data: { feedbackMood: mood, feedbackNote: nextNote, feedbackAt: now, feedbackAskedAt: s.feedbackAskedAt ?? now },
  });
  if (mood !== s.feedbackMood || nextNote !== s.feedbackNote) await tellTrainer(s, mood, nextNote);
  return updated;
}

/** Комментарий для тренера после выбора самочувствия. */
export async function saveFeedbackNote(actor: Actor, sessionId: string, input: unknown, now: Date = new Date()) {
  const s = await ownCompleted(actor, sessionId);
  if (!s.feedbackMood) throw new AppError("CONFLICT", "Сначала выберите самочувствие");
  const { note } = feedbackNoteSchema.parse(input);
  const updated = await prisma.session.update({ where: { id: s.id }, data: { feedbackNote: note, feedbackAt: now } });
  if (note !== s.feedbackNote) await tellTrainer(s, s.feedbackMood, note);
  return updated;
}

/** Последние ответы клиента о самочувствии (для карточки клиента у тренера). */
export async function listFeedback(actor: Actor, clientId: string, take = 5) {
  await assertClientAccess(prisma, actor, clientId);
  return prisma.session.findMany({
    where: { clientId, feedbackMood: { not: null } },
    orderBy: { startsAt: "desc" },
    select: { id: true, startsAt: true, feedbackMood: true, feedbackNote: true },
    take,
  });
}

/** Включены ли у клиента push-уведомления. */
export async function clientHasPush(actor: Actor, clientId: string) {
  await assertClientAccess(prisma, actor, clientId);
  return (await prisma.pushSubscription.count({ where: { user: { clientProfile: { id: clientId } } } })) > 0;
}
