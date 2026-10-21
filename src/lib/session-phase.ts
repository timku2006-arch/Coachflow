export type SessionPhase = "upcoming" | "in_progress" | "awaiting_results" | "completed" | "cancelled" | "missed";

export type SessionStatusValue = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "MISSED";
type S = { status: SessionStatusValue; startsAt: Date; endsAt: Date };

/**
 * Этап жизни записи. Как только время занятия наступило, запись становится
 * карточкой результатов, которую заполняет тренер.
 */
export function sessionPhase(s: S, now: Date = new Date()): SessionPhase {
  if (s.status === "CANCELLED") return "cancelled";
  if (s.status === "COMPLETED") return "completed";
  if (s.status === "MISSED") return "missed";
  if (now < s.startsAt) return "upcoming";
  if (now < s.endsAt) return "in_progress";
  return "awaiting_results";
}

export const phaseLabel: Record<SessionPhase, string> = {
  upcoming: "Запланировано",
  in_progress: "Идёт сейчас",
  awaiting_results: "Ждёт результатов",
  completed: "Проведено",
  cancelled: "Отменено",
  missed: "Не пришёл",
};

/** Можно ли вносить результаты (после начала занятия, кроме отменённых). */
export const canEnterResults = (s: S, now: Date = new Date()) =>
  s.status !== "CANCELLED" && now >= s.startsAt;

/** Пропуск = отмена или неявка. */
export const isSkipped = (s: { status: SessionStatusValue }) => s.status === "CANCELLED" || s.status === "MISSED";

export type Attendance = "confirmed" | "pending" | "cancelled" | null;

/** Статус записи для календаря тренера: подтверждена / не подтверждена / отменена. Для прошедших — null. */
export function attendanceOf(s: S & { confirmedAt?: Date | null }, now: Date = new Date()): Attendance {
  if (s.status === "CANCELLED") return "cancelled";
  if (s.status !== "SCHEDULED" || s.startsAt <= now) return null;
  return s.confirmedAt ? "confirmed" : "pending";
}

export const attendanceLabel: Record<Exclude<Attendance, null>, string> = {
  confirmed: "Подтверждена",
  pending: "Не подтверждена",
  cancelled: "Отменена",
};
