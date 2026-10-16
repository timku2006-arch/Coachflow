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
  if (results.length === 0) return <Empty>Результаты ещё не внесены</Empty>;
  const groups = groupResults(results);
  return (
    <ul className={compact ? "space-y-1 text-sm" : "stagger space-y-2"}>
      {groups.map((g) =>
        compact ? (
          <li key={g.name}>
            <span className="font-bold">{g.name}:</span>{" "}
            <span className="text-ink-2">{g.sets.map((s) => `${fmtKg(s.weightKg)}×${s.reps}`).join(", ")}</span>
          </li>
        ) : (
          <li key={g.name} className="rounded-2xl bg-subtle p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-bold">{g.name}</span>
              <span className="text-xs font-semibold text-muted">
                макс. {fmtKg(Math.max(...g.sets.map((x) => x.weightKg)))} кг
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.sets.map((s) => (
                <span key={s.id} className="rounded-xl bg-surface px-2.5 py-1.5 text-sm font-semibold shadow-soft">
                  <span className="mr-1 text-[11px] text-muted">#{s.setNumber}</span>
                  {fmtKg(s.weightKg)}
                  <span className="text-muted"> × </span>
                  {s.reps}
                </span>
              ))}
            </div>
          </li>
        ),
      )}
    </ul>
  );
}
