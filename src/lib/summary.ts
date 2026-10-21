import { plural } from "./time";

export type PeriodKind = "week" | "month";

export type Summary = {
  period: PeriodKind;
  completed: number;
  missed: number; // неявки и отмены клиентом
  records: { exercise: string; weightKg: number }[];
  exercises: { exercise: string; deltaKg: number }[]; // изменение рабочего веса
  measures: { label: string; delta: number; unit: string }[]; // изменение замеров (включая вес тела)
};

const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
const signed = (n: number) => `${n > 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Дружелюбный текст итога: заголовок и не больше четырёх коротких строк.
 * Без перегруза цифрами: только самое заметное.
 */
export function summaryText(s: Summary): { headline: string; lines: string[] } {
  const when = s.period === "week" ? "на этой неделе" : "в этом месяце";
  const lines: string[] = [];
  let headline: string;

  if (s.completed === 0 && s.missed === 0) {
    headline = s.period === "week" ? "Неделя только начинается" : "Месяц только начинается";
    lines.push(`Тренировок ${when} пока не было. Ждём вас!`);
    return { headline, lines };
  }

  const trainings = plural(s.completed, ["тренировка", "тренировки", "тренировок"]);
  if (s.missed === 0) headline = s.completed >= 3 ? `Отличная работа: ${trainings}!` : `${trainings[0].toUpperCase()}${trainings.slice(1)} ${when}`;
  else headline = `${trainings[0].toUpperCase()}${trainings.slice(1)}, пропусков: ${s.missed}`;

  if (s.missed > 0 && s.completed > 0) lines.push("Пропуски бывают — главное, что вы продолжаете.");
  if (s.missed > 0 && s.completed === 0) lines.push("Давайте вернёмся в ритм — тренер ждёт вас.");

  if (s.records.length) {
    const [r, ...rest] = s.records;
    lines.push(`Новый рекорд: ${lc(r.exercise)} ${fmt(r.weightKg)} кг!${rest.length ? ` И ещё ${plural(rest.length, ["рекорд", "рекорда", "рекордов"])}.` : ""}`);
  }

  const up = s.exercises.filter((e) => e.deltaKg > 0).slice(0, 2);
  if (up.length) lines.push(`Веса растут: ${up.map((e) => `${lc(e.exercise)} ${signed(e.deltaKg)} кг`).join(", ")}.`);

  const measures = s.measures.filter((m) => Math.abs(m.delta) >= 0.1).slice(0, 2);
  if (measures.length) lines.push(`${measures.map((m) => `${m.label} ${signed(m.delta)} ${m.unit}`).join(", ")}.`);

  return { headline, lines: lines.slice(0, 4) };
}
