import Link from "next/link";
import type { listHistory } from "@/server/services/sessions";
import { formatDateTime } from "@/lib/time";
import { Empty } from "./ui";
import { ResultsList } from "./results-list";

export function HistoryList({ history, hrefBase }: { history: Awaited<ReturnType<typeof listHistory>>; hrefBase: string }) {
  if (history.length === 0) return <Empty>Прошедших тренировок пока нет</Empty>;
  return (
    <ul className="stagger space-y-3">
      {history.map((s) => (
        <li key={s.id}>
          <Link href={`${hrefBase}/${s.id}`} className="block rounded-3xl border border-line bg-surface p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-extrabold tracking-tight first-letter:uppercase">{formatDateTime(s.startsAt)}</span>
              {s.status === "SCHEDULED" && <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-800">Ждёт результатов</span>}
            </div>
            {s.status === "COMPLETED" && <ResultsList results={s.results} compact />}
            {s.notes && <p className="mt-2 text-sm italic text-muted">{s.notes}</p>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
