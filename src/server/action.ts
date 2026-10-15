import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { AppError } from "./errors";

/** Состояние формы, возвращаемое server action. */
export type FormState = { ok?: boolean; error?: string; message?: string; ts?: number };

/**
 * Выполняет действие и превращает ожидаемые ошибки (валидация, права, бизнес-правила)
 * в сообщение для формы. redirect()/notFound() пробрасываются дальше.
 */
export async function handle(fn: () => Promise<string | void>): Promise<FormState> {
  try {
    const message = await fn();
    return { ok: true, message: message || undefined, ts: Date.now() };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof AppError) return { error: e.message, ts: Date.now() };
    if (e instanceof ZodError) return { error: e.issues[0]?.message ?? "Проверьте введённые данные", ts: Date.now() };
    console.error(e);
    return { error: "Что-то пошло не так. Попробуйте ещё раз.", ts: Date.now() };
  }
}

export const formObject = (fd: FormData) => Object.fromEntries(fd.entries());

/** Разбор JSON из скрытого поля формы (для динамических списков). */
export function jsonField(fd: FormData, name: string): unknown {
  const raw = fd.get(name);
  if (typeof raw !== "string") throw new AppError("VALIDATION", "Некорректные данные формы");
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError("VALIDATION", "Некорректные данные формы");
  }
}
