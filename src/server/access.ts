import type { Prisma, PrismaClient } from "@prisma/client";
import type { Actor, TrainerActor } from "./actor";
import { AppError, notFound } from "./errors";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Проверяет, что актор имеет доступ к данным клиента:
 * клиент — только к себе, тренер — только к своим клиентам.
 * Чужие данные выглядят как «не найдено», чтобы не раскрывать их существование.
 */
export async function assertClientAccess(db: Db, actor: Actor, clientId: string) {
  if (actor.role === "CLIENT") {
    if (actor.clientId !== clientId) throw notFound("Клиент");
    return;
  }
  const client = await db.clientProfile.findUnique({ where: { id: clientId }, select: { trainerId: true } });
  if (!client || client.trainerId !== actor.trainerId) throw notFound("Клиент");
}

export function assertTrainer(actor: Actor): asserts actor is TrainerActor {
  if (actor.role !== "TRAINER") throw new AppError("FORBIDDEN", "Действие доступно только тренеру");
}
