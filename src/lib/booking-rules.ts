/**
 * Ключевое бизнес-правило CoachFlow — «окно в 3 часа».
 *
 * Клиент может перенести или отменить занятие, только если до его начала
 * осталось СТРОГО БОЛЬШЕ 3 часов. Ровно 3:00 — уже нельзя.
 * Для тренера ограничение не действует.
 *
 * Сравниваются абсолютные моменты времени (UTC-миллисекунды), поэтому результат
 * не зависит от часового пояса сервера или браузера.
 */
export const CLIENT_CHANGE_WINDOW_HOURS = 3;
export const CLIENT_CHANGE_WINDOW_MS = CLIENT_CHANGE_WINDOW_HOURS * 60 * 60 * 1000;

export function clientCanChangeSession(startsAt: Date, now: Date = new Date()): boolean {
  return startsAt.getTime() - now.getTime() > CLIENT_CHANGE_WINDOW_MS;
}

/** Ссылка на Telegram тренера (или null, если username не задан). */
export function telegramLink(username: string | null | undefined): string | null {
  if (!username) return null;
  return `https://t.me/${encodeURIComponent(username.replace(/^@/, ""))}`;
}
