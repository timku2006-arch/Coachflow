import Link from "next/link";
import { formatDateTime, formatTime } from "@/lib/time";
import { sessionPhase } from "@/lib/session-phase";
import { Empty, PhaseBadge } from "./ui";

type S = { id: string; startsAt: Date; endsAt: Date; status: "SCHEDULED" | "COMPLETED" | "CANCELLED"; client?: { user: { name: string } } };

export function SessionList({ sessions, href, empty, showClient }: { sessions: S[]; href: (id: string) => string; empty: string; showClient?: boolean }) {
  if (sessions.length === 0) return <Empty>{empty}</Empty>;
  return (
    <ul className="divide-y divide-slate-100">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link href={href(s.id)} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50">
            <div className="min-w-0">
              <div className="text-sm font-medium first-letter:uppercase">
                {formatDateTime(s.startsAt)}–{formatTime(s.endsAt)}
              </div>
              {showClient && s.client && <div className="truncate text-sm text-slate-500">{s.client.user.name}</div>}
            </div>
            <PhaseBadge phase={sessionPhase(s)} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
