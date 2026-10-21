import { plural } from "./time";

/** Порог «заканчивается»: осталось столько занятий или меньше. */
export const LOW_SESSIONS_THRESHOLD = 2;
/** Порог «скоро истекает»: до конца срока столько дней или меньше. */
export const EXPIRY_DAYS_THRESHOLD = 7;

type M = { remainingSessions: number; validFrom: string; validUntil: string }; // даты — YYYY-MM-DD

/** Абонемент действует на дату: есть занятия и дата в пределах срока. */
export function coversDate(m: M, date: string): boolean {
  return m.remainingSessions > 0 && m.validFrom <= date && date <= m.validUntil;
}

/** Из нескольких абонементов списываем с того, что раньше закончится. */
export function pickForWriteOff<T extends M>(list: T[], date: string): T | null {
  return [...list].filter((m) => coversDate(m, date)).sort((a, b) => a.validUntil.localeCompare(b.validUntil))[0] ?? null;
}

/** Целых дней от today до validUntil (0 — последний день). */
export function daysLeft(validUntil: string, today: string): number {
  return Math.round((Date.parse(`${validUntil}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export const isLow = (remaining: number) => remaining <= LOW_SESSIONS_THRESHOLD;
export const isExpiringSoon = (validUntil: string, today: string) => {
  const d = daysLeft(validUntil, today);
  return d >= 0 && d <= EXPIRY_DAYS_THRESHOLD;
};

/** «Осталось 4 занятия» / «Осталось 1 занятие» / «Занятия закончились». */
export function remainingText(n: number): string {
  if (n <= 0) return "Занятия закончились";
  const word = plural(n, ["занятие", "занятия", "занятий"]);
  return `Осталось ${word}`;
}
