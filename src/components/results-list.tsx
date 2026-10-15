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
    <ul className={compact ? "space-y-1 text-sm" : "space-y-3"}>
      {groups.map((g) =>
        compact ? (
          <li key={g.name}>
            <span className="font-medium">{g.name}:</span>{" "}
            <span className="text-slate-600">{g.sets.map((s) => `${fmtKg(s.weightKg)}×${s.reps}`).join(", ")}</span>
          </li>
        ) : (
          <li key={g.name}>
            <div className="mb-1 font-medium">{g.name}</div>
            <div className="flex flex-wrap gap-1.5">
              {g.sets.map((s) => (
                <span key={s.id} className="rounded-lg bg-slate-100 px-2 py-1 text-sm">
                  <span className="text-slate-400">{s.setNumber}.</span> {fmtKg(s.weightKg)} кг × {s.reps}
                </span>
              ))}
            </div>
          </li>
        ),
      )}
    </ul>
  );
}
