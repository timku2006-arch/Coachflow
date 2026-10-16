import { Dumbbell } from "lucide-react";
import { Empty } from "./ui";

type Row = { id: string; setNumber: number; weightKg: number; reps: number; exercise: { id: string; name: string } };

/** Подходы, сгруппированные по упражнениям, в порядке выполнения. */
export function groupResults(rows: Row[]) {
  const groups = new Map<string, { name: string; sets: Row[] }>();
  for (const r of rows) {
    if (!groups.has(r.exercise.id)) groups.set(r.exercise.id, { name: r.exercise.name, sets: [] });
    groups.get(r.exercise.id)!.sets.push(r);
  }
  for (const g of groups.values()) g.sets.sort((a, b) => a.setNumber - b.setNumber);
  return [...groups.values()];
}

export const fmtKg = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

export function ResultsList({ results, compact }: { results: Row[]; compact?: boolean }) {
  if (results.length === 0) return <Empty icon={<Dumbbell size={26} strokeWidth={1.6} />}>Результаты ещё не внесены</Empty>;
  const groups = groupResults(results);
  if (compact)
    return (
      <ul className="space-y-1 text-sm">
        {groups.map((g) => (
          <li key={g.name} className="flex gap-2">
            <span className="shrink-0 text-ink-2">{g.name}</span>
            <span className="truncate font-display font-semibold text-mint">{g.sets.map((s) => `${fmtKg(s.weightKg)}×${s.reps}`).join("  ")}</span>
          </li>
        ))}
      </ul>
    );
  return (
    <ol className="stagger divide-y divide-line/60">
      {groups.map((g) => (
        <li key={g.name} className="py-3 first:pt-0">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-[17px] font-semibold">{g.name}</span>
            <span className="text-[13px] font-semibold text-mint">макс. {fmtKg(Math.max(...g.sets.map((x) => x.weightKg)))} кг</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.sets.map((s) => (
              <span key={s.id} className="rounded-xl bg-subtle px-3 py-2 font-display text-[17px] font-semibold leading-none">
                {fmtKg(s.weightKg)}
                <span className="text-muted">×</span>
                {s.reps}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
