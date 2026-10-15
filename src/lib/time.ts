import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfWeek } from "date-fns";
import { ru } from "date-fns/locale";

/** Часовой пояс приложения: все расчёты «по календарю» и отображение — в нём. */
export const APP_TZ = "Europe/Moscow";

/** Длительность одного занятия. */
export const SESSION_DURATION_MIN = 90;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isDateString(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

export function isTimeString(s: string): boolean {
  return TIME_RE.test(s);
}

/** «2026-10-15» + «10:30» по Москве → момент времени (UTC). */
export function moscowLocalToDate(date: string, time: string): Date {
  if (!isDateString(date) || !isTimeString(time)) throw new Error("Некорректная дата или время");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(new TZDate(y, mo - 1, d, h, mi, APP_TZ).getTime());
}

export function toMoscow(d: Date): TZDate {
  return new TZDate(d.getTime(), APP_TZ);
}

/** Дата по Москве в формате YYYY-MM-DD. */
export function moscowDateString(d: Date): string {
  return format(toMoscow(d), "yyyy-MM-dd");
}

/** Время по Москве в формате HH:mm. */
export function moscowTimeString(d: Date): string {
  return format(toMoscow(d), "HH:mm");
}

/** Календарная дата → значение для колонки @db.Date (полночь UTC). */
export function dateOnly(date: string): Date {
  if (!isDateString(date)) throw new Error("Некорректная дата");
  return new Date(`${date}T00:00:00.000Z`);
}

/** Значение колонки @db.Date → YYYY-MM-DD. */
export function dateOnlyToString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Понедельник 00:00 по Москве для недели, содержащей момент d. */
export function moscowWeekStart(d: Date): Date {
  return new Date(startOfWeek(toMoscow(d), { weekStartsOn: 1 }).getTime());
}

/** Начало недели из параметра ?week=YYYY-MM-DD (любой день недели) или текущая неделя. */
export function weekStartFromParam(param: string | undefined, now = new Date()): Date {
  if (param && isDateString(param)) return moscowWeekStart(moscowLocalToDate(param, "12:00"));
  return moscowWeekStart(now);
}

/** 7 дней недели (начало каждого дня по Москве). */
export function weekDays(weekStart: Date): Date[] {
  const start = toMoscow(weekStart);
  return Array.from({ length: 7 }, (_, i) => new Date(addDays(start, i).getTime()));
}

export function addMoscowDays(d: Date, days: number): Date {
  return new Date(addDays(toMoscow(d), days).getTime());
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

// ---- Форматирование для интерфейса ----
const fmt = (d: Date, pattern: string) => format(toMoscow(d), pattern, { locale: ru });

export const formatDate = (d: Date) => fmt(d, "d MMMM yyyy");
export const formatDateShort = (d: Date) => fmt(d, "d MMM");
export const formatTime = (d: Date) => fmt(d, "HH:mm");
export const formatDateTime = (d: Date) => fmt(d, "d MMMM, EEEEEE, HH:mm");
export const formatWeekday = (d: Date) => fmt(d, "EEEEEE, d MMM");
export const formatTimeRange = (a: Date, b: Date) => `${formatTime(a)}–${formatTime(b)}`;

/** Русское склонение: plural(5, ["упражнение", "упражнения", "упражнений"]) → «5 упражнений». */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  const form = a > 10 && a < 20 ? forms[2] : b > 1 && b < 5 ? forms[1] : b === 1 ? forms[0] : forms[2];
  return `${n} ${form}`;
}
