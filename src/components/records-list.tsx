import { Trophy } from "lucide-react";
import { Empty } from "./ui";
import { formatDate } from "@/lib/time";

type R = { id: string; weightKg: number; reps: number; previousWeightKg: number | null; achievedAt: Date; exercise: { name: string } };
const kg = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

/** Список личных рекордов (для клиента и тренера). */
export function RecordsList({ records }: { records: R[] }) {
  if (!records.length) return <div className="glass rounded-3xl"><Empty icon={<Trophy size={28} strokeWidth={1.6} />}>Рекордов пока нет — всё впереди</Empty></div>;
  return (
    <ul className="glass stagger divide-y divide-line/60 rounded-3xl px-4">
      {records.map((r) => (
        <li key={r.id} className="flex items-center gap-3 py-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-mint/25 to-lilac/25 text-mint">
            <Trophy size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-semibold">{r.exercise.name}</div>
            <div className="text-[14px] text-muted">{formatDate(r.achievedAt)}</div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-semibold text-mint">
              {kg(r.weightKg)} кг <span className="text-[15px] text-muted">× {r.reps}</span>
            </div>
            {r.previousWeightKg !== null && <div className="text-[13px] text-muted">было {kg(r.previousWeightKg)} кг</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}
