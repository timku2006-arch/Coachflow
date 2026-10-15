/**
 * Тестовые данные CoachFlow: один тренер, два клиента, программы,
 * прошедшие тренировки с результатами и предстоящие записи.
 * Данные строятся относительно текущей даты, поэтому seed можно перезапускать.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addMinutes, addMoscowDays, dateOnly, moscowDateString, moscowLocalToDate, SESSION_DURATION_MIN } from "../src/lib/time";

const prisma = new PrismaClient();

const TRAINER_PASSWORD = "trainer123";
const CLIENT_PASSWORD = "client123";

/** Дата по Москве со сдвигом в днях от сегодня + время. */
function at(dayOffset: number, time: string) {
  const day = moscowDateString(addMoscowDays(new Date(), dayOffset));
  return moscowLocalToDate(day, time);
}

async function main() {
  await prisma.$transaction([
    prisma.sessionResult.deleteMany(),
    prisma.session.deleteMany(),
    prisma.programExercise.deleteMany(),
    prisma.program.deleteMany(),
    prisma.exercise.deleteMany(),
    prisma.nutritionTargets.deleteMany(),
    prisma.clientNote.deleteMany(),
    prisma.bodyWeightEntry.deleteMany(),
    prisma.clientProfile.deleteMany(),
    prisma.trainerProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const trainerUser = await prisma.user.create({
    data: {
      email: "trainer@coachflow.local",
      name: "Алексей Тренер",
      role: "TRAINER",
      passwordHash: await bcrypt.hash(TRAINER_PASSWORD, 10),
      trainerProfile: { create: { telegramUsername: "coachflow_trainer" } },
    },
    include: { trainerProfile: true },
  });
  const trainer = trainerUser.trainerProfile!;

  const clientHash = await bcrypt.hash(CLIENT_PASSWORD, 10);
  const mkClient = (email: string, name: string, heightCm: number, goal: string) =>
    prisma.user
      .create({
        data: {
          email,
          name,
          role: "CLIENT",
          passwordHash: clientHash,
          clientProfile: { create: { trainerId: trainer.id, heightCm, goal } },
        },
        include: { clientProfile: true },
      })
      .then((u) => u.clientProfile!);

  const anna = await mkClient("anna@coachflow.local", "Анна Смирнова", 168, "Снизить вес до 62 кг и подтянуть фигуру");
  const ivan = await mkClient("ivan@coachflow.local", "Иван Петров", 182, "Набрать мышечную массу, присед 120 кг");

  const names = ["Приседания со штангой", "Жим лёжа", "Становая тяга", "Тяга верхнего блока", "Выпады с гантелями", "Жим гантелей сидя", "Ягодичный мост"];
  const ex: Record<string, string> = {};
  for (const name of names) {
    ex[name] = (await prisma.exercise.create({ data: { trainerId: trainer.id, name } })).id;
  }

  // Программы
  await prisma.program.create({
    data: {
      clientId: anna.id,
      name: "Фулбади 3×/нед",
      description: "Круговая силовая работа на всё тело. Отдых между подходами 60–90 с.",
      isActive: true,
      exercises: {
        create: [
          { exerciseId: ex["Приседания со штангой"], position: 0, sets: 3, reps: "12", weightKg: 35 },
          { exerciseId: ex["Тяга верхнего блока"], position: 1, sets: 3, reps: "12", weightKg: 30 },
          { exerciseId: ex["Выпады с гантелями"], position: 2, sets: 3, reps: "10 на ногу", weightKg: 8 },
          { exerciseId: ex["Ягодичный мост"], position: 3, sets: 4, reps: "15", weightKg: 40, notes: "Пауза 1 с вверху" },
        ],
      },
    },
  });
  await prisma.program.create({
    data: {
      clientId: ivan.id,
      name: "Сплит верх/низ",
      description: "Прогрессия нагрузки: +2,5 кг, когда выполнены все повторения.",
      isActive: true,
      exercises: {
        create: [
          { exerciseId: ex["Приседания со штангой"], dayLabel: "Низ", position: 0, sets: 5, reps: "5", weightKg: 100 },
          { exerciseId: ex["Становая тяга"], dayLabel: "Низ", position: 1, sets: 3, reps: "5", weightKg: 120 },
          { exerciseId: ex["Жим лёжа"], dayLabel: "Верх", position: 2, sets: 5, reps: "5", weightKg: 80 },
          { exerciseId: ex["Жим гантелей сидя"], dayLabel: "Верх", position: 3, sets: 3, reps: "8–10", weightKg: 22 },
        ],
      },
    },
  });

  // Питание
  await prisma.nutritionTargets.create({ data: { clientId: anna.id, calories: 1700, proteinG: 120, fatG: 55, carbsG: 175 } });
  await prisma.nutritionTargets.create({ data: { clientId: ivan.id, calories: 3000, proteinG: 170, fatG: 90, carbsG: 380 } });

  // Заметки
  await prisma.clientNote.createMany({
    data: [
      { clientId: anna.id, text: "Старая травма правого колена — без глубоких выпадов с большим весом." },
      { clientId: ivan.id, text: "Хочет выступить на любительских соревнованиях по пауэрлифтингу весной." },
    ],
  });

  // Вес тела: каждые 4 дня за последние 8 недель
  for (let i = 14; i >= 0; i--) {
    const d = dateOnly(moscowDateString(addMoscowDays(new Date(), -i * 4)));
    await prisma.bodyWeightEntry.create({ data: { clientId: anna.id, date: d, weightKg: +(68.4 - (14 - i) * 0.32 + (i % 3) * 0.15).toFixed(1) } });
    await prisma.bodyWeightEntry.create({ data: { clientId: ivan.id, date: d, weightKg: +(78.0 + (14 - i) * 0.2 - (i % 2) * 0.2).toFixed(1) } });
  }

  const session = async (clientId: string, startsAt: Date, extra: { status?: "SCHEDULED" | "COMPLETED" | "CANCELLED"; notes?: string } = {}) =>
    prisma.session.create({
      data: {
        trainerId: trainer.id,
        clientId,
        startsAt,
        endsAt: addMinutes(startsAt, SESSION_DURATION_MIN),
        createdById: trainerUser.id,
        status: extra.status ?? "SCHEDULED",
        notes: extra.notes,
        ...(extra.status === "CANCELLED" ? { cancelledAt: startsAt, cancelledById: trainerUser.id } : {}),
      },
    });

  const sets = (sessionId: string, exerciseId: string, weightKg: number, reps: number[]) =>
    reps.map((r, i) => ({ sessionId, exerciseId, setNumber: i + 1, weightKg, reps: r }));

  // Прошедшие тренировки с результатами (прогрессия весов)
  for (let w = 0; w < 6; w++) {
    const daysAgo = 42 - w * 7;
    const a = await session(anna.id, at(-daysAgo, "10:00"), { status: "COMPLETED", notes: w === 5 ? "Отличная тренировка, добавляем вес в мосте." : undefined });
    await prisma.sessionResult.createMany({
      data: [
        ...sets(a.id, ex["Приседания со штангой"], 25 + w * 2.5, [12, 12, 11]),
        ...sets(a.id, ex["Тяга верхнего блока"], 25 + w, [12, 12, 12]),
        ...sets(a.id, ex["Ягодичный мост"], 30 + w * 2.5, [15, 15, 15, 14]),
      ],
    });
    const i = await session(ivan.id, at(-daysAgo + 1, "19:00"), { status: "COMPLETED" });
    await prisma.sessionResult.createMany({
      data: [
        ...sets(i.id, ex["Приседания со штангой"], 90 + w * 2.5, [5, 5, 5, 5, 4]),
        ...sets(i.id, ex["Жим лёжа"], 72.5 + w * 1.25, [5, 5, 5, 5, 5]),
        ...sets(i.id, ex["Становая тяга"], 110 + w * 2.5, [5, 5, 5]),
      ],
    });
  }

  // Прошедшая, но ещё не заполненная тренировка — ждёт результатов
  await session(ivan.id, at(-1, "19:00"));
  // Отменённая
  await session(anna.id, at(-3, "12:00"), { status: "CANCELLED" });

  // Предстоящие записи
  const soon = new Date(Math.ceil((Date.now() + 2 * 3_600_000) / 900_000) * 900_000); // ~через 2 часа: окно закрыто
  await session(anna.id, soon, { notes: "План: техника приседа, лёгкий вес." });
  await session(anna.id, at(2, "10:00"));
  await session(anna.id, at(5, "10:00"));
  await session(ivan.id, at(1, "19:00"));
  await session(ivan.id, at(3, "19:00"));
  await session(ivan.id, at(6, "12:00"));

  console.log("Seed готов:");
  console.log(`  Тренер:  trainer@coachflow.local / ${TRAINER_PASSWORD}`);
  console.log(`  Клиенты: anna@coachflow.local, ivan@coachflow.local / ${CLIENT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
