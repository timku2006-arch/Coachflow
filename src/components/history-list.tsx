import Link from "next/link";
import type { listHistory } from "@/server/services/sessions";
import { formatDateTime } from "@/lib/time";
import { Empty } from "./ui";
import { ResultsList } from "./results-list";

export function HistoryList({ history, hrefBase }: { history: Awaited<ReturnType<typeof listHistory>>; hrefBase: string }) {
  if (history.length === 0) return <Empty>Прошедших тренировок пока нет</Empty>;
  return (
    <ul className="space-y-3">
      {history.map((s) => (
        <li key={s.id}>
          <Link href={`${hrefBase}/${s.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-500">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-medium first-letter:uppercase">{formatDateTime(s.startsAt)}</span>
              {s.status === "SCHEDULED" && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">Ждёт результатов</span>}
            </div>
            {s.status === "COMPLETED" && <ResultsList results={s.results} compact />}
            {s.notes && <p className="mt-2 text-sm italic text-slate-500">{s.notes}</p>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
