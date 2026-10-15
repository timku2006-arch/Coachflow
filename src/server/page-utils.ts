import "server-only";
import { notFound } from "next/navigation";
import { AppError } from "./errors";

/** «Не найдено» из сервиса (в т.ч. чужие данные) → страница 404; прочие ошибки пробрасываются. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
}
