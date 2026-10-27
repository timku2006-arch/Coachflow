"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireTrainer } from "@/server/auth";
import { formObject, handle, jsonField, type FormState } from "@/server/action";
import { trainerProfileSchema } from "@/lib/validation";
import * as clients from "@/server/services/clients";
import { issueInvite } from "@/server/services/invites";
import * as exercises from "@/server/services/exercises";
import * as programs from "@/server/services/programs";

const refresh = () => revalidatePath("/", "layout");

// ---- Профиль тренера
export async function updateTrainerProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    const data = trainerProfileSchema.parse(formObject(fd));
    await prisma.user.update({
      where: { id: actor.userId },
      data: { name: data.name, trainerProfile: { update: { telegramUsername: data.telegramUsername } } },
    });
    refresh();
    return "Профиль сохранён";
  });
}

// ---- Клиенты
export async function createClientAction(_: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    const user = await clients.createClient(actor, formObject(fd));
    refresh();
    redirect(`/trainer/clients/${user.clientProfile!.id}?created=1`);
  });
}

export async function updateClientProfileAction(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await clients.updateClientProfile(actor, clientId, formObject(fd));
    refresh();
    return "Профиль клиента сохранён";
  });
}

export async function issueInviteAction(clientId: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await issueInvite(actor, clientId);
    refresh();
    return "Новая ссылка готова — отправьте её клиенту";
  });
}

export async function deleteClientAction(clientId: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    const name = await clients.deleteClient(actor, clientId);
    refresh();
    redirect(`/trainer/clients?deleted=${encodeURIComponent(name)}`);
  });
}

export async function setNutritionAction(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await clients.setNutritionTargets(actor, clientId, formObject(fd));
    refresh();
    return "Ориентиры по питанию сохранены";
  });
}

export async function addClientNoteAction(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await clients.addClientNote(actor, clientId, formObject(fd));
    refresh();
  });
}

export async function deleteClientNoteAction(noteId: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await clients.deleteClientNote(actor, noteId);
    refresh();
  });
}

// ---- Упражнения
export async function createExerciseAction(_: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await exercises.createExercise(actor, formObject(fd));
    refresh();
    return "Упражнение добавлено";
  });
}

export async function renameExerciseAction(id: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await exercises.renameExercise(actor, id, formObject(fd));
    refresh();
    return "Сохранено";
  });
}

export async function deleteExerciseAction(id: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await exercises.deleteExercise(actor, id);
    refresh();
  });
}

// ---- Программы
export async function createProgramAction(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    const p = await programs.createProgram(actor, clientId, jsonField(fd, "program"));
    refresh();
    redirect(`/trainer/programs/${p.id}?saved=1`);
  });
}

export async function updateProgramAction(programId: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await programs.updateProgram(actor, programId, jsonField(fd, "program"));
    refresh();
    return "Программа сохранена";
  });
}

export async function activateProgramAction(programId: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await programs.activateProgram(actor, programId);
    refresh();
    return "Программа назначена текущей";
  });
}

export async function deleteProgramAction(programId: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    const clientId = await programs.deleteProgram(actor, programId);
    refresh();
    redirect(`/trainer/clients/${clientId}?tab=programs`);
  });
}
