import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertClientAccess, assertTrainer } from "../access";
import { notFound } from "../errors";
import { programSchema } from "@/lib/validation";
import { assertOwnExercises } from "./exercises";

const withItems = {
  exercises: { orderBy: { position: "asc" as const }, include: { exercise: true } },
};

export async function listPrograms(actor: Actor, clientId: string) {
  await assertClientAccess(prisma, actor, clientId);
  return prisma.program.findMany({
    where: { clientId },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: { _count: { select: { exercises: true } } },
  });
}

export async function getActiveProgram(actor: Actor, clientId: string) {
  await assertClientAccess(prisma, actor, clientId);
  return prisma.program.findFirst({ where: { clientId, isActive: true }, include: withItems });
}

export async function getProgram(actor: Actor, programId: string) {
  const program = await prisma.program.findUnique({ where: { id: programId }, include: withItems });
  if (!program) throw notFound("Программа");
  await assertClientAccess(prisma, actor, program.clientId);
  return program;
}

type SaveOptions = { makeActive?: boolean };

export async function createProgram(actor: Actor, clientId: string, input: unknown, opts: SaveOptions = {}) {
  assertTrainer(actor);
  await assertClientAccess(prisma, actor, clientId);
  const data = programSchema.parse(input);
  await assertOwnExercises(actor.trainerId, data.items.map((i) => i.exerciseId));
  const hasActive = (await prisma.program.count({ where: { clientId, isActive: true } })) > 0;
  const makeActive = opts.makeActive ?? !hasActive;
  return prisma.$transaction(async (tx) => {
    if (makeActive) await tx.program.updateMany({ where: { clientId }, data: { isActive: false } });
    return tx.program.create({
      data: {
        clientId,
        name: data.name,
        description: data.description,
        isActive: makeActive,
        exercises: { create: data.items.map((item, position) => ({ ...item, position })) },
      },
    });
  });
}

export async function updateProgram(actor: Actor, programId: string, input: unknown) {
  assertTrainer(actor);
  const program = await getProgram(actor, programId);
  const data = programSchema.parse(input);
  await assertOwnExercises(actor.trainerId, data.items.map((i) => i.exerciseId));
  return prisma.$transaction(async (tx) => {
    await tx.programExercise.deleteMany({ where: { programId: program.id } });
    return tx.program.update({
      where: { id: program.id },
      data: {
        name: data.name,
        description: data.description,
        exercises: { create: data.items.map((item, position) => ({ ...item, position })) },
      },
    });
  });
}

/** Делает программу текущей (у клиента может быть только одна текущая). */
export async function activateProgram(actor: Actor, programId: string) {
  assertTrainer(actor);
  const program = await getProgram(actor, programId);
  await prisma.$transaction([
    prisma.program.updateMany({ where: { clientId: program.clientId }, data: { isActive: false } }),
    prisma.program.update({ where: { id: program.id }, data: { isActive: true } }),
  ]);
}

export async function deleteProgram(actor: Actor, programId: string) {
  assertTrainer(actor);
  const program = await getProgram(actor, programId);
  await prisma.program.delete({ where: { id: program.id } });
  return program.clientId;
}
