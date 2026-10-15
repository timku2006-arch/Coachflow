import { z } from "zod";
import { isDateString, isTimeString } from "./time";

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
});

export const createClientSchema = z.object({
  name: requiredText(100, "Имя"),
  email,
  password,
  heightCm,
  goal: optionalText(500),
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
export const sessionTimeSchema = z.object({ date: dateString, time: timeString });

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
