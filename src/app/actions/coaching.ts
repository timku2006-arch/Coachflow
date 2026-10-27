"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActor, requireTrainer } from "@/server/auth";
import { formObject, handle, type FormState } from "@/server/action";
import { confirmAttendance, markMissed } from "@/server/services/sessions";
import { deleteMeasurement, saveMeasurement } from "@/server/services/measurements";
import { deletePhoto } from "@/server/services/photos";
import { adjustRemaining, createMembership, deleteMembership, markPaid } from "@/server/services/memberships";
import { saveFeedback, saveFeedbackNote } from "@/server/services/feedback";
import { createTimeOff, deleteTimeOff, setWeeklyDaysOff } from "@/server/services/days-off";
import { plural } from "@/lib/time";

// Все проверки прав и правил — внутри сервисов.
const refresh = () => revalidatePath("/", "layout");

export async function confirmAttendanceAction(sessionId: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    await confirmAttendance(actor, sessionId);
    refresh();
    return "Отлично, ждём вас!";
  });
}

export async function markMissedAction(sessionId: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await markMissed(actor, sessionId);
    refresh();
    return "Отмечено: клиент не пришёл";
  });
}

export async function saveMeasurementAction(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    await saveMeasurement(actor, clientId, formObject(fd));
    refresh();
    return "Замеры сохранены";
  });
}

export async function deleteMeasurementAction(id: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    await deleteMeasurement(actor, id);
    refresh();
  });
}

export async function deletePhotoAction(photoId: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    await deletePhoto(actor, photoId);
    refresh();
    return "Фото удалено";
  });
}

export async function createMembershipAction(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await createMembership(actor, clientId, formObject(fd));
    refresh();
    return "Абонемент оформлен";
  });
}

export async function adjustMembershipAction(id: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await adjustRemaining(actor, id, formObject(fd));
    refresh();
    return "Остаток обновлён";
  });
}

export async function markPaidAction(id: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await markPaid(actor, id);
    refresh();
    return "Оплата отмечена";
  });
}

export async function deleteMembershipAction(id: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await deleteMembership(actor, id);
    refresh();
    return "Абонемент удалён";
  });
}

// ---- Самочувствие после тренировки
export async function saveFeedbackAction(sessionId: string, mood: number, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    await saveFeedback(actor, sessionId, { mood });
    refresh();
    redirect(`/client/sessions/${sessionId}/feedback`);
  });
}

export async function saveFeedbackNoteAction(sessionId: string, _: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireActor();
    await saveFeedbackNote(actor, sessionId, formObject(fd));
    refresh();
    return "Спасибо! Тренер прочитает.";
  });
}

// ---- Нерабочие дни
export async function setWeeklyDaysOffAction(_: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await setWeeklyDaysOff(actor, fd.getAll("weeklyOff"));
    refresh();
    return "Выходные сохранены";
  });
}

export async function createTimeOffAction(_: FormState, fd: FormData): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    const { cancelled } = await createTimeOff(actor, formObject(fd));
    refresh();
    return cancelled
      ? `Готово. Отменено ${plural(cancelled, ["занятие", "занятия", "занятий"])}, клиенты предупреждены.`
      : "Готово. Занятий в эти дни не было — просто закрыли их для записи.";
  });
}

export async function deleteTimeOffAction(id: string, _: FormState): Promise<FormState> {
  return handle(async () => {
    const { actor } = await requireTrainer();
    await deleteTimeOff(actor, id);
    refresh();
  });
}
