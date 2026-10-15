import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertTrainer } from "../access";
import { AppError, notFound } from "../errors";
import { exerciseSchema } from "@/lib/validation";

/** Справочник упражнений тренера (клиенту — справочник его тренера). */
export async function listExercises(actor: Actor) {
  return prisma.exercise.findMany({
    where: { trainerId: actor.trainerId },
    orderBy: { name: "asc" },
    include: { _count: { select: { programItems: true, results: true } } },
  });
}

function mapUnique(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    throw new AppError("CONFLICT", "Упражнение с таким названием уже есть");
  }
  throw e;
}

export async function createExercise(actor: Actor, input: unknown) {
  assertTrainer(actor);
  const { name } = exerciseSchema.parse(input);
  return prisma.exercise.create({ data: { trainerId: actor.trainerId, name } }).catch(mapUnique);
}

async function ownExercise(actor: Actor, exerciseId: string) {
  assertTrainer(actor);
  const ex = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!ex || ex.trainerId !== actor.trainerId) throw notFound("Упражнение");
  return ex;
}

export async function renameExercise(actor: Actor, exerciseId: string, input: unknown) {
  await ownExercise(actor, exerciseId);
  const { name } = exerciseSchema.parse(input);
  return prisma.exercise.update({ where: { id: exerciseId }, data: { name } }).catch(mapUnique);
}

export async function deleteExercise(actor: Actor, exerciseId: string) {
  await ownExercise(actor, exerciseId);
  const used = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { _count: { select: { programItems: true, results: true } } },
  });
  if (used && (used._count.programItems > 0 || used._count.results > 0)) {
    throw new AppError("CONFLICT", "Упражнение используется в программах или результатах — удалить нельзя");
  }
  await prisma.exercise.delete({ where: { id: exerciseId } });
}

/** Проверяет, что все упражнения принадлежат тренеру. */
export async function assertOwnExercises(trainerId: string, ids: string[], db: Prisma.TransactionClient | typeof prisma = prisma) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  const count = await db.exercise.count({ where: { id: { in: unique }, trainerId } });
  if (count !== unique.length) throw new AppError("VALIDATION", "Выбрано неизвестное упражнение");
}
