"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActor, requireClient } from "@/server/auth";
import { formObject, handle, jsonField, type FormState } from "@/server/action";
import * as sessions from "@/server/services/sessions";
import * as clients from "@/server/services/clients";
import { remainingText } from "@/lib/membership";

// Все проверки (роль, владение записью, окно в 3 часа, пересечения) — внутри сервисов.
const refresh = () => revalidatePath("/", "layout");
const base = (role: "TRAINER" | "CLIENT") => (role === "TRAINER" ? "/trainer" : "/client");

export async function createSessionAction(_: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    const s = await sessions.createSession(actor, formObject(fd));
    refresh();
    redirect(`${base(actor.role)}/sessions/${s.id}?booked=1`);
  });
}

export async function rescheduleSessionAction(sessionId: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    await sessions.rescheduleSession(actor, sessionId, formObject(fd));
    refresh();
    return "Занятие перенесено";
  });
}

export async function cancelSessionAction(sessionId: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    await sessions.cancelSession(actor, sessionId);
    refresh();
    return "Занятие отменено";
  });
}

export async function saveResultsAction(sessionId: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    const outcome = await sessions.saveSessionResults(actor, sessionId, jsonField(fd, "results"));
    refresh();
    const extra = outcome.records.map((r) => `🏆 ${r.title}`);
    if (outcome.remaining !== null) extra.push(`Списано занятие с абонемента. ${remainingText(outcome.remaining)}.`);
    for (const b of outcome.badges) extra.push(`🎖 Клиент получил значок «${b.title}»`);
    return ["Результаты сохранены", ...extra].join("\n");
  });
}

/**
 * Автосохранение черновика во время тренировки. Страницу не обновляем —
 * тренер в это время печатает.
 */
export async function saveResultsDraftAction(sessionId: string, draft: unknown): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    await sessions.saveResultsDraft(actor, sessionId, draft);
  });
}

export async function updateSessionNotesAction(sessionId: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    await sessions.updateSessionNotes(actor, sessionId, formObject(fd));
    refresh();
    return "Заметка сохранена";
  });
}

// ---- Вес тела (клиент — себе, тренер — своему клиенту)
export async function addBodyWeightAction(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    await clients.addBodyWeight(actor, clientId, formObject(fd));
    refresh();
    return "Вес записан";
  });
}

export async function deleteBodyWeightAction(entryId: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    await clients.deleteBodyWeight(actor, entryId);
    refresh();
  });
}

// ---- Профиль клиента (сам клиент)
export async function updateOwnProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireClient();
    await clients.updateClientProfile(actor, actor.clientId, formObject(fd));
    refresh();
    return "Профиль сохранён";
  });
}
