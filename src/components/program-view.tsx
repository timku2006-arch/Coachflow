import { Empty } from "./ui";
import { fmtKg } from "./results-list";

type Item = { id: string; dayLabel: string | null; sets: number; reps: string; weightKg: number | null; notes: string | null; exercise: { name: string } };

/** Программа, сгруппированная по дням (если тренер их указал). */
export function ProgramView({ program }: { program: { name: string; description: string | null; exercises: Item[] } }) {
  const groups: { day: string | null; items: Item[] }[] = [];
  for (const it of program.exercises) {
    const last = groups.at(-1);
    if (last && last.day === it.dayLabel) last.items.push(it);
    else groups.push({ day: it.dayLabel, items: [it] });
  }
  return (
    <div className="space-y-4">
      {program.description && <p className="whitespace-pre-line text-sm text-slate-600">{program.description}</p>}
      {program.exercises.length === 0 && <Empty>В программе пока нет упражнений</Empty>}
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.day && <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">{g.day}</h3>}
          <ol className="space-y-2">
            {g.items.map((it) => (
              <li key={it.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{it.exercise.name}</span>
                  <span className="text-sm text-slate-600">
                    {it.sets} × {it.reps}
                    {it.weightKg != null && <> · {fmtKg(it.weightKg)} кг</>}
                  </span>
                </div>
                {it.notes && <p className="mt-1 text-sm text-slate-500">{it.notes}</p>}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
