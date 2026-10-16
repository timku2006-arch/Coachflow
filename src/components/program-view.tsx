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
      {program.description && <p className="whitespace-pre-line text-sm text-ink-2">{program.description}</p>}
      {program.exercises.length === 0 && <Empty>В программе пока нет упражнений</Empty>}
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.day && <h3 className="mb-2 mt-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-700">{g.day}</h3>}
          <ol className="stagger space-y-2">
            {g.items.map((it, idx) => (
              <li key={it.id} className="flex gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-soft">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-extrabold text-brand-700">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-bold">{it.exercise.name}</span>
                  <span className="rounded-full bg-subtle px-2.5 py-0.5 text-sm font-bold text-ink-2">
                    {it.sets} × {it.reps}
                    {it.weightKg != null && <> · {fmtKg(it.weightKg)} кг</>}
                  </span>
                </div>
                {it.notes && <p className="mt-1 text-sm text-muted">{it.notes}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
