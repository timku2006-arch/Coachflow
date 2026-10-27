import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import type { Actor, TrainerActor } from "../actor";
import { assertClientAccess, assertTrainer } from "../access";
import { AppError, notFound } from "../errors";
import {
  bodyWeightSchema,
  clientNoteSchema,
  clientProfileSchema,
  createClientSchema,
  nutritionSchema,
} from "@/lib/validation";
import { dateOnly } from "@/lib/time";
import { onNutritionChanged } from "./events";
import { getStorage } from "../storage";

export async function listClients(actor: TrainerActor) {
  assertTrainer(actor);
  return prisma.clientProfile.findMany({
    where: { trainerId: actor.trainerId },
    include: {
      // _count.pushSubscriptions — включены ли у клиента уведомления
      user: { select: { name: true, email: true, _count: { select: { pushSubscriptions: true } } } },
      sessions: {
        where: { status: "SCHEDULED", startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 1,
      },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export async function createClient(actor: Actor, input: unknown) {
  assertTrainer(actor);
  const data = createClientSchema.parse(input);
  const passwordHash = await bcrypt.hash(data.password, 10);
  try {
    return await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: "CLIENT",
        mustChangePassword: true,
        clientProfile: {
          create: { trainerId: actor.trainerId, heightCm: data.heightCm, goal: data.goal, sessionDurationMin: data.sessionDurationMin },
        },
      },
      include: { clientProfile: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new AppError("CONFLICT", "Пользователь с таким email уже существует");
    }
    throw e;
  }
}

/** Полная карточка клиента. Заметки тренера отдаются только тренеру. */
export async function getClient(actor: Actor, clientId: string) {
  await assertClientAccess(prisma, actor, clientId);
  const client = await prisma.clientProfile.findUnique({
    where: { id: clientId },
    include: {
      user: { select: { name: true, email: true } },
      nutrition: true,
      bodyWeights: { orderBy: { date: "asc" } },
      notes: actor.role === "TRAINER" ? { orderBy: { createdAt: "desc" } } : false,
      trainer: { include: { user: { select: { name: true } } } },
    },
  });
  if (!client) throw notFound("Клиент");
  return client;
}

/** Профиль клиента может менять сам клиент или его тренер. */
export async function updateClientProfile(actor: Actor, clientId: string, input: unknown) {
  await assertClientAccess(prisma, actor, clientId);
  const data = clientProfileSchema.parse(input);
  return prisma.clientProfile.update({
    where: { id: clientId },
    data: {
      heightCm: data.heightCm,
      goal: data.goal,
      // длительность занятий задаёт тренер
      ...(actor.role === "TRAINER" && data.sessionDurationMin ? { sessionDurationMin: data.sessionDurationMin } : {}),
      user: { update: { name: data.name } },
    },
  });
}

/**
 * Удаляет клиента целиком: аккаунт, записи, результаты, программы, замеры, абонементы, фото.
 * Отменить нельзя. Уведомления тренера о нём тоже убираются, чтобы не вели на пустые страницы.
 */
export async function deleteClient(actor: Actor, clientId: string) {
  assertTrainer(actor);
  await assertClientAccess(prisma, actor, clientId);
  const client = await prisma.clientProfile.findUniqueOrThrow({
    where: { id: clientId },
    select: { userId: true, user: { select: { name: true } }, sessions: { select: { id: true } }, photos: { select: { storageKey: true, thumbKey: true } } },
  });
  const urls = [`/trainer/clients/${clientId}`, ...client.sessions.map((s) => `/trainer/sessions/${s.id}`)];
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { userId: actor.userId, url: { in: urls } } }),
    // ClientProfile и всё, что к нему привязано, удаляются каскадом
    prisma.user.delete({ where: { id: client.userId } }),
  ]);
  const storage = getStorage();
  await Promise.allSettled(client.photos.flatMap((p) => [storage.delete(p.storageKey), storage.delete(p.thumbKey)]));
  return client.user.name;
}

export async function addClientNote(actor: Actor, clientId: string, input: unknown) {
  assertTrainer(actor);
  await assertClientAccess(prisma, actor, clientId);
  const { text } = clientNoteSchema.parse(input);
  return prisma.clientNote.create({ data: { clientId, text } });
}

export async function deleteClientNote(actor: Actor, noteId: string) {
  assertTrainer(actor);
  const note = await prisma.clientNote.findUnique({ where: { id: noteId } });
  if (!note) throw notFound("Заметка");
  await assertClientAccess(prisma, actor, note.clientId);
  await prisma.clientNote.delete({ where: { id: noteId } });
}

/** Ориентиры по калориям и БЖУ задаёт только тренер. */
export async function setNutritionTargets(actor: Actor, clientId: string, input: unknown) {
  assertTrainer(actor);
  await assertClientAccess(prisma, actor, clientId);
  const data = nutritionSchema.parse(input);
  const saved = await prisma.nutritionTargets.upsert({
    where: { clientId },
    create: { clientId, ...data },
    update: data,
  });
  await onNutritionChanged(clientId, data);
  return saved;
}

/** Запись веса тела (одна на дату — повторная запись перезаписывает). */
export async function addBodyWeight(actor: Actor, clientId: string, input: unknown) {
  await assertClientAccess(prisma, actor, clientId);
  const data = bodyWeightSchema.parse(input);
  const date = dateOnly(data.date);
  return prisma.bodyWeightEntry.upsert({
    where: { clientId_date: { clientId, date } },
    create: { clientId, date, weightKg: data.weightKg },
    update: { weightKg: data.weightKg },
  });
}

export async function deleteBodyWeight(actor: Actor, entryId: string) {
  const entry = await prisma.bodyWeightEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw notFound("Запись веса");
  await assertClientAccess(prisma, actor, entry.clientId);
  await prisma.bodyWeightEntry.delete({ where: { id: entryId } });
}
