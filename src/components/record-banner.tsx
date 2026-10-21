import { Trophy } from "lucide-react";
import { Confetti } from "./celebrate";
import { recordTitle } from "@/lib/records";

type R = { weightKg: number; reps: number; previousWeightKg: number | null; previousReps: number | null; exercise: { name: string } };

/** «Новый рекорд: жим лёжа 80 кг!» — с конфетти. */
export function RecordBanner({ record, more = 0, moreSuffix = " за неделю" }: { record: R; more?: number; moreSuffix?: string }) {
  const prev = record.previousWeightKg !== null && record.previousReps !== null ? { weightKg: record.previousWeightKg, reps: record.previousReps } : null;
  return (
    <section className="relative mb-5 animate-pop overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2a1f4a] via-[#16293a] to-[#123a33] p-5 ring-1 ring-inset ring-white/10">
      <Confetti />
      <div className="relative flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-mint to-lilac text-[#0a0d14] shadow-glow">
          <Trophy size={30} />
        </span>
        <div>
          <p className="font-display text-[1.3rem] font-semibold leading-snug">{recordTitle(record.exercise.name, record, prev)}</p>
          {more > 0 && <p className="mt-0.5 text-[15px] text-ink-2">И ещё {more}
            {moreSuffix}</p>}
        </div>
      </div>
    </section>
  );
}
