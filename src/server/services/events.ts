// Тексты уведомлений о событиях. Получатель — «другая сторона»:
// действие клиента → уведомление тренеру, действие тренера → клиенту.
import { prisma } from "../db";
import type { Actor } from "../actor";
import { notify } from "./notifications";
import { formatDateTime, formatTime, plural, relativeDayLabel } from "@/lib/time";

type SessionRef = { id: string; clientId: string; trainerId: string; startsAt: Date; endsAt: Date };

async function parties(s: { clientId: string; trainerId: string }) {
  const [client, trainer] = await Promise.all([
    prisma.clientProfile.findUnique({ where: { id: s.clientId }, select: { userId: true, user: { select: { name: true } } } }),
    prisma.trainerProfile.findUnique({ where: { id: s.trainerId }, select: { userId: true } }),
  ]);
  return { clientUserId: client?.userId, clientName: client?.user.name ?? "Клиент", trainerUserId: trainer?.userId };
}

const when = (s: { startsAt: Date; endsAt: Date }) => `${formatDateTime(s.startsAt)}–${formatTime(s.endsAt)}`;

export async function onSessionBooked(actor: Actor, s: SessionRef) {
  const p = await parties(s);
  if (actor.role === "CLIENT") {
    await notify([p.trainerUserId], { type: "session_booked", title: `Новая запись: ${p.clientName}`, body: when(s), url: `/trainer/sessions/${s.id}` });
  } else {
    await notify([p.clientUserId], { type: "session_booked", title: "Вы записаны на тренировку", body: when(s), url: `/client/sessions/${s.id}` });
  }
}

export async function onSessionRescheduled(actor: Actor, before: { startsAt: Date; endsAt: Date }, s: SessionRef) {
  const p = await parties(s);
  const body = `${when(before)} → ${when(s)}`;
  if (actor.role === "CLIENT") {
    await notify([p.trainerUserId], { type: "session_rescheduled", title: `Перенос: ${p.clientName}`, body, url: `/trainer/sessions/${s.id}` });
  } else {
    await notify([p.clientUserId], { type: "session_rescheduled", title: "Тренер перенёс тренировку", body, url: `/client/sessions/${s.id}` });
  }
}

export async function onSessionCancelled(actor: Actor, s: SessionRef) {
  const p = await parties(s);
  if (actor.role === "CLIENT") {
    await notify([p.trainerUserId], { type: "session_cancelled", title: `Отмена: ${p.clientName}`, body: when(s), url: `/trainer/sessions/${s.id}` });
  } else {
    await notify([p.clientUserId], { type: "session_cancelled", title: "Тренер отменил тренировку", body: when(s), url: `/client/sessions/${s.id}` });
  }
}

export async function onResultsSaved(s: SessionRef, firstTime: boolean, sets: { exerciseId: string }[]) {
  const p = await parties(s);
  const exercises = new Set(sets.map((x) => x.exerciseId)).size;
  await notify([p.clientUserId], {
    type: "results_ready",
    title: firstTime ? "Результаты тренировки готовы 💪" : "Результаты тренировки обновлены",
    body: `${relativeDayLabel(s.startsAt)}: ${plural(exercises, ["упражнение", "упражнения", "упражнений"])}, ${plural(sets.length, ["подход", "подхода", "подходов"])}`,
    url: `/client/sessions/${s.id}`,
    collapse: true,
  });
}

async function clientUserId(clientId: string) {
  return (await prisma.clientProfile.findUnique({ where: { id: clientId }, select: { userId: true } }))?.userId;
}

export async function onProgramChanged(clientId: string, programName: string, kind: "new" | "updated") {
  await notify([await clientUserId(clientId)], {
    type: "program_updated",
    title: kind === "new" ? "Новая программа тренировок" : "Программа тренировок обновлена",
    body: programName,
    url: "/client/program",
    collapse: true,
  });
}

export async function onNutritionChanged(clientId: string, n: { calories: number; proteinG: number; fatG: number; carbsG: number }) {
  await notify([await clientUserId(clientId)], {
    type: "nutrition_updated",
    title: "Новые ориентиры по питанию",
    body: `${n.calories} ккал · Б ${n.proteinG} · Ж ${n.fatG} · У ${n.carbsG}`,
    url: "/client/profile",
    collapse: true,
  });
}
