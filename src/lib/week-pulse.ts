import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { moscowDateString, toMoscow, weekDays } from "./time";

type S = { startsAt: Date; status: "SCHEDULED" | "COMPLETED" | "CANCELLED" };

/** Данные для «Пульса недели»: по каждому дню — сколько запланировано и сколько проведено. */
export function buildWeekPulse(weekStart: Date, sessions: S[], now: Date = new Date()) {
  const today = moscowDateString(now);
  return weekDays(weekStart).map((d) => {
    const key = moscowDateString(d);
    const dayS = sessions.filter((s) => s.status !== "CANCELLED" && moscowDateString(s.startsAt) === key);
    return {
      key,
      label: format(toMoscow(d), "EEEEEE", { locale: ru }),
      day: format(toMoscow(d), "d"),
      planned: dayS.length,
      done: dayS.filter((s) => s.status === "COMPLETED").length,
      today: key === today,
      past: key < today,
    };
  });
}
