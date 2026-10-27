// Нерабочие дни тренера: постоянные выходные по дням недели и периоды (больничный, отпуск).
// Даты — календарные строки YYYY-MM-DD по Москве.

export type TimeOffReason = "sick" | "vacation" | "other";
export type DayOffReason = "weekly" | TimeOffReason;

export const TIME_OFF_REASONS: { value: TimeOffReason; label: string }[] = [
  { value: "sick", label: "Больничный" },
  { value: "vacation", label: "Отпуск" },
  { value: "other", label: "Не работаю" },
];

export const dayOffLabel: Record<DayOffReason, string> = {
  weekly: "Выходной",
  sick: "Больничный",
  vacation: "Отпуск",
  other: "Тренер не работает",
};

/** Текст для клиента, почему отменено занятие. */
export const cancelReasonText: Record<TimeOffReason, string> = {
  sick: "Тренер заболел",
  vacation: "Тренер в отпуске",
  other: "Тренер не работает в этот день",
};

export const WEEKDAYS: { value: number; short: string; long: string }[] = [
  { value: 1, short: "Пн", long: "понедельник" },
  { value: 2, short: "Вт", long: "вторник" },
  { value: 3, short: "Ср", long: "среда" },
  { value: 4, short: "Чт", long: "четверг" },
  { value: 5, short: "Пт", long: "пятница" },
  { value: 6, short: "Сб", long: "суббота" },
  { value: 7, short: "Вс", long: "воскресенье" },
];

/** День недели календарной даты: 1 — пн … 7 — вс. */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export type DaysOff = { weekly: number[]; periods: { startsOn: string; endsOn: string; reason: TimeOffReason }[] };

/** Почему дата закрыта для записи, или null, если тренер работает. Период важнее выходного. */
export function dayOffReason(date: string, off: DaysOff): DayOffReason | null {
  const period = off.periods.find((p) => p.startsOn <= date && date <= p.endsOn);
  if (period) return period.reason;
  return off.weekly.includes(isoWeekday(date)) ? "weekly" : null;
}

/** «по воскресеньям», «по субботам и воскресеньям». */
export function weeklyOffText(days: number[]) {
  const plural: Record<number, string> = { 1: "понедельникам", 2: "вторникам", 3: "средам", 4: "четвергам", 5: "пятницам", 6: "субботам", 7: "воскресеньям" };
  const names = [...days].sort().map((d) => plural[d]);
  if (names.length === 0) return "";
  return "по " + (names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} и ${names.at(-1)}`);
}
