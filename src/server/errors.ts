export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "TOO_LATE";

/** Ожидаемая ошибка бизнес-логики: сообщение показывается пользователю. */
export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "Запись") => new AppError("NOT_FOUND", `${what} не найдена`);
