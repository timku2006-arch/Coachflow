import { z } from "zod";
import { SESSION_DURATIONS, isDateString, isTimeString } from "./time";

/** Пустая строка из формы → undefined. */
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const trimmed = (max: number) => z.string().trim().max(max, `Не длиннее ${max} символов`);

export const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, trimmed(max).optional()).transform((v) => v ?? null);

export const requiredText = (max: number, label = "Поле") =>
  trimmed(max).min(1, `${label}: обязательно`);

const num = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label}: введите число` }).finite(`${label}: введите число`);

/** Числовое поле формы: пустая строка не превращается в 0, а считается незаполненной. */
const field = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(emptyToUndefined, schema);

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Некорректный email")
  .max(254);

export const password = z
  .string()
  .min(8, "Пароль: минимум 8 символов")
  .max(128, "Пароль: максимум 128 символов");

export const dateString = z.string().refine(isDateString, "Некорректная дата");
export const timeString = z.string().refine(isTimeString, "Некорректное время");
export const id = z.string().min(1).max(64);

/** Длительность занятия: 60, 75 или 90 минут. Пустое поле — не задано. */
export const durationMin = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number()
    .refine((v) => (SESSION_DURATIONS as readonly number[]).includes(v), "Длительность: 60, 75 или 90 минут")
    .optional(),
);

// ---- Аутентификация ----
export const loginSchema = z.object({ email, password: z.string().min(1, "Введите пароль").max(128) });

export const registerTrainerSchema = z.object({
  name: requiredText(100, "Имя"),
  email,
  password,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль").max(128),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

/** Клиент по ссылке-приглашению придумывает пароль. */
export const setPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "Пароли не совпадают", path: ["confirmPassword"] });

// ---- Профили ----
export const telegramUsername = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "") : v),
  z.union([
    z.literal("").transform(() => null),
    z.string().regex(/^[A-Za-z0-9_]{5,32}$/, "Telegram username: 5–32 символа, латиница, цифры и _"),
  ]),
);

export const trainerProfileSchema = z.object({
  name: requiredText(100, "Имя"),
  telegramUsername,
});

const heightCm = z.preprocess(emptyToUndefined, num("Рост").int("Рост: целое число").min(100, "Рост: от 100 см").max(250, "Рост: до 250 см").optional()).transform((v) => v ?? null);

export const clientProfileSchema = z.object({
  name: requiredText(100, "Имя"),
  heightCm,
  goal: optionalText(500),
  sessionDurationMin: durationMin,
});

export const createClientSchema = z.object({
  name: requiredText(100, "Имя"),
  email,
  // без пароля клиент получает ссылку-приглашение и задаёт пароль сам
  password: z.preprocess(emptyToUndefined, password.optional()),
  heightCm,
  goal: optionalText(500),
  sessionDurationMin: durationMin,
});

export const bodyWeightSchema = z.object({
  date: dateString,
  weightKg: field(num("Вес").min(20, "Вес: от 20 кг").max(400, "Вес: до 400 кг")),
});

export const clientNoteSchema = z.object({ text: requiredText(2000, "Заметка") });

export const nutritionSchema = z.object({
  calories: field(num("Калории").int("Калории: целое число").min(500, "Калории: от 500").max(10000, "Калории: до 10000")),
  proteinG: field(num("Белки").int("Белки: целое число").min(0).max(1000)),
  fatG: field(num("Жиры").int("Жиры: целое число").min(0).max(1000)),
  carbsG: field(num("Углеводы").int("Углеводы: целое число").min(0).max(2000)),
});

// ---- Упражнения и программы ----
export const exerciseSchema = z.object({ name: requiredText(100, "Название упражнения") });

export const programItemSchema = z.object({
  exerciseId: id,
  dayLabel: optionalText(50),
  sets: field(num("Подходы").int().min(1, "Подходы: от 1").max(20, "Подходы: до 20")),
  reps: requiredText(30, "Повторения"),
  weightKg: z.preprocess(emptyToUndefined, num("Вес").min(0).max(1000).optional()).transform((v) => v ?? null),
  notes: optionalText(300),
});

export const programSchema = z.object({
  name: requiredText(100, "Название программы"),
  description: optionalText(2000),
  items: z.array(programItemSchema).max(100, "Не больше 100 упражнений"),
});

// ---- Записи и результаты ----
// durationMin задаёт только тренер; если не указана — берётся длительность клиента (при переносе — прежняя)
export const sessionTimeSchema = z.object({ date: dateString, time: timeString, durationMin });

export const createSessionSchema = sessionTimeSchema.extend({ clientId: id.optional() });

export const resultSetSchema = z.object({
  exerciseId: id,
  weightKg: field(num("Вес").min(0, "Вес не может быть отрицательным").max(1000, "Вес: до 1000 кг")),
  reps: field(num("Повторения").int("Повторения: целое число").min(1, "Повторения: от 1").max(1000)),
});

export const sessionResultsSchema = z.object({
  notes: optionalText(2000),
  sets: z.array(resultSetSchema).max(200, "Не больше 200 подходов"),
});

/** Черновик во время тренировки: поля как в редакторе, могут быть пустыми. */
export const resultsDraftSchema = z.object({
  notes: z.string().max(2000),
  sets: z
    .array(z.object({ exerciseId: id, weightKg: z.string().max(12), reps: z.string().max(12) }))
    .max(200, "Не больше 200 подходов"),
  savedAt: z.number().int().positive(),
});
export type ResultsDraft = z.infer<typeof resultsDraftSchema>;

// ---- Разовые тренировки
export const sessionPriceSchema = z.object({
  sessionPriceRub: z
    .preprocess(emptyToUndefined, num("Цена").int("Цена: целое число рублей").min(0, "Цена не может быть отрицательной").max(1_000_000).optional())
    .transform((v) => v ?? null),
});

// ---- Нерабочие дни
export const weeklyDaysOffSchema = z
  .array(z.coerce.number().int().min(1).max(7))
  .max(6, "Хотя бы один день в неделе должен быть рабочим")
  .transform((d) => [...new Set(d)].sort());

export const timeOffSchema = z
  .object({
    startsOn: dateString,
    endsOn: dateString,
    reason: z.enum(["sick", "vacation", "other"], { errorMap: () => ({ message: "Выберите причину" }) }),
  })
  .refine((v) => v.endsOn >= v.startsOn, { message: "Дата окончания раньше даты начала", path: ["endsOn"] })
  .refine((v) => Date.parse(v.endsOn) - Date.parse(v.startsOn) <= 92 * 86_400_000, { message: "Не больше 3 месяцев за раз", path: ["endsOn"] });

// ---- Самочувствие после тренировки
export const feedbackSchema = z.object({
  mood: z.coerce.number().int().min(1, "Выберите самочувствие").max(3, "Выберите самочувствие"),
  note: optionalText(500),
});
export const feedbackNoteSchema = z.object({ note: optionalText(500) });

// ---- Замеры тела
const cm = (label: string) =>
  z.preprocess(emptyToUndefined, num(label).min(20, `${label}: от 20 см`).max(300, `${label}: до 300 см`).optional()).transform((v) => v ?? null);

export const measurementSchema = z
  .object({
    date: dateString,
    weightKg: z.preprocess(emptyToUndefined, num("Вес").min(20, "Вес: от 20 кг").max(400, "Вес: до 400 кг").optional()).transform((v) => v ?? null),
    waistCm: cm("Талия"),
    hipsCm: cm("Бёдра"),
    chestCm: cm("Грудь"),
    armCm: cm("Руки"),
  })
  .refine((v) => [v.weightKg, v.waistCm, v.hipsCm, v.chestCm, v.armCm].some((x) => x !== null), { message: "Заполните хотя бы один замер" });

// ---- Абонементы
export const membershipSchema = z
  .object({
    totalSessions: field(num("Количество занятий").int("Количество занятий: целое число").min(1, "Минимум 1 занятие").max(500)),
    validFrom: dateString,
    validUntil: dateString,
    paid: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
    priceRub: z.preprocess(emptyToUndefined, num("Цена").int().min(0).max(10_000_000).optional()).transform((v) => v ?? null),
    note: optionalText(300),
  })
  .refine((v) => v.validUntil >= v.validFrom, { message: "Дата окончания раньше даты начала", path: ["validUntil"] });

export const membershipAdjustSchema = z.object({
  remainingSessions: field(num("Остаток").int("Остаток: целое число").min(0, "Остаток не может быть меньше 0").max(500)),
  note: optionalText(300),
});
