export type SessionPhase = "upcoming" | "in_progress" | "awaiting_results" | "completed" | "cancelled";

type S = { status: "SCHEDULED" | "COMPLETED" | "CANCELLED"; startsAt: Date; endsAt: Date };

/**
 * Этап жизни записи. Как только время занятия наступило, запись становится
 * карточкой результатов, которую заполняет тренер.
 */
export function sessionPhase(s: S, now: Date = new Date()): SessionPhase {
  if (s.status === "CANCELLED") return "cancelled";
  if (s.status === "COMPLETED") return "completed";
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
};

/** Можно ли вносить результаты (после начала занятия, кроме отменённых). */
export const canEnterResults = (s: S, now: Date = new Date()) =>
  s.status !== "CANCELLED" && now >= s.startsAt;
