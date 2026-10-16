import { ClipboardList } from "lucide-react";
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
  let n = 0;
  return (
    <div className="space-y-6">
      {program.description && <p className="max-w-prose text-[15px] text-muted">{program.description}</p>}
      {program.exercises.length === 0 && <Empty icon={<ClipboardList size={26} strokeWidth={1.6} />}>В программе пока нет упражнений</Empty>}
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.day && (
            <h3 className="mb-2 px-1 font-display text-[1.375rem] font-bold">{g.day}</h3>
          )}
          <ol className="stagger divide-y divide-line/60 glass rounded-3xl px-4">
            {g.items.map((it) => {
              n++;
              return (
                <li key={it.id} className="grid grid-cols-[2rem_1fr_auto] items-center gap-x-3 py-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-subtle font-display text-[15px] font-bold text-muted">{n}</span>
                  <div className="min-w-0">
                    <div className="text-[17px] font-semibold">{it.exercise.name}</div>
                    {it.notes && <p className="mt-0.5 text-sm text-muted">{it.notes}</p>}
                  </div>
                  <div className="text-right font-display leading-none">
                    <div className="text-xl font-bold text-mint">
                      {it.sets}×{it.reps}
                    </div>
                    {it.weightKg != null && <div className="mt-0.5 text-[13px] font-semibold text-muted">{fmtKg(it.weightKg)} кг</div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
