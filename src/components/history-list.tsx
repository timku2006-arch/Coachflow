import { History } from "lucide-react";
import type { listHistory } from "@/server/services/sessions";
import { formatDate, formatTime } from "@/lib/time";
import { Empty, ListRow } from "./ui";
import { ResultsList } from "./results-list";

export function HistoryList({ history, hrefBase }: { history: Awaited<ReturnType<typeof listHistory>>; hrefBase: string }) {
  if (history.length === 0) return <Empty icon={<History size={28} strokeWidth={1.6} />}>Прошедших тренировок пока нет</Empty>;
  return (
    <ul className="stagger space-y-3">
      {history.map((s) => (
        <li key={s.id} className="glass rounded-3xl px-4">
          <ListRow href={`${hrefBase}/${s.id}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[17px] font-semibold first-letter:uppercase">{formatDate(s.startsAt)}</span>
                <span className="font-display font-semibold text-muted">{formatTime(s.startsAt)}</span>
              </div>
              <div className="mt-1.5">
                {s.status === "COMPLETED" ? (
                  <ResultsList results={s.results} compact />
                ) : (
                  <span className="text-[13px] font-semibold text-coral">● Ждёт результатов</span>
                )}
              </div>
              {s.notes && <p className="mt-1.5 text-[14px] italic text-muted">«{s.notes}»</p>}
            </div>
          </ListRow>
        </li>
      ))}
    </ul>
  );
}
