import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { formatTime, relativeDayLabel } from "@/lib/time";
import { sessionPhase } from "@/lib/session-phase";
import { Avatar, Empty, PhaseBadge } from "./ui";

type S = { id: string; startsAt: Date; endsAt: Date; status: "SCHEDULED" | "COMPLETED" | "CANCELLED"; client?: { user: { name: string } } };

export function SessionList({ sessions, href, empty, showClient }: { sessions: S[]; href: (id: string) => string; empty: string; showClient?: boolean }) {
  if (sessions.length === 0) return <Empty icon={<CalendarCheck size={28} />}>{empty}</Empty>;
  return (
    <ul className="stagger -mx-1 space-y-1">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link
            href={href(s.id)}
            className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-all duration-200 hover:bg-subtle active:scale-[0.99]"
          >
            <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-subtle py-1.5 transition group-hover:bg-surface">
              <span className="text-[15px] font-extrabold leading-none tracking-tight">{formatTime(s.startsAt)}</span>
              <span className="mt-1 text-[10px] font-semibold text-muted">{formatTime(s.endsAt)}</span>
            </div>
            {showClient && s.client && <Avatar name={s.client.user.name} size="sm" />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{showClient && s.client ? s.client.user.name : relativeDayLabel(s.startsAt)}</div>
              <div className="truncate text-xs text-muted first-letter:uppercase">{showClient && s.client ? relativeDayLabel(s.startsAt) : "Тренировка · 90 мин"}</div>
            </div>
            <PhaseBadge phase={sessionPhase(s)} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
