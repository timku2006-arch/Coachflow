import { prisma } from "@/server/db";
import type { ClientActor, TrainerActor } from "@/server/actor";

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "MembershipEntry","Membership","ClientAchievement","BodyMeasurement","ProgressPhoto","PersonalRecord","Notification","PushSubscription","AppSetting","SessionResult","Session","ProgramExercise","Program","Exercise","NutritionTargets","ClientNote","BodyWeightEntry","ClientProfile","TrainerProfile","User" CASCADE',
  );
}

let n = 0;
export async function makeTrainer(): Promise<TrainerActor> {
  n++;
  const u = await prisma.user.create({
    data: {
      email: `trainer${n}@test.local`,
      name: `Тренер ${n}`,
      passwordHash: "x",
      role: "TRAINER",
      trainerProfile: { create: { telegramUsername: "coach_test" } },
    },
    include: { trainerProfile: true },
  });
  return { role: "TRAINER", userId: u.id, trainerId: u.trainerProfile!.id };
}

export async function makeClient(trainer: TrainerActor): Promise<ClientActor> {
  n++;
  const u = await prisma.user.create({
    data: {
      email: `client${n}@test.local`,
      name: `Клиент ${n}`,
      passwordHash: "x",
      role: "CLIENT",
      clientProfile: { create: { trainerId: trainer.trainerId } },
    },
    include: { clientProfile: true },
  });
  return { role: "CLIENT", userId: u.id, clientId: u.clientProfile!.id, trainerId: trainer.trainerId };
}
