import { CalendarCheck } from "lucide-react";
import { formatTime, relativeDayLabel } from "@/lib/time";
import { sessionPhase } from "@/lib/session-phase";
import { Avatar, Empty, ListRow, PhaseBadge } from "./ui";

type S = { id: string; startsAt: Date; endsAt: Date; status: "SCHEDULED" | "COMPLETED" | "CANCELLED"; client?: { user: { name: string } } };

/** Список занятий: время крупно слева, статус под именем, шеврон справа. */
export function SessionList({ sessions, href, empty, showClient }: { sessions: S[]; href: (id: string) => string; empty: string; showClient?: boolean }) {
  if (sessions.length === 0) return <Empty icon={<CalendarCheck size={28} strokeWidth={1.6} />}>{empty}</Empty>;
  return (
    <ul className="stagger divide-y divide-line/60">
      {sessions.map((s) => {
        const phase = sessionPhase(s);
        return (
          <li key={s.id}>
            <ListRow href={href(s.id)}>
              {showClient && s.client && <Avatar name={s.client.user.name} />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-semibold">{showClient && s.client ? s.client.user.name : relativeDayLabel(s.startsAt)}</div>
                <PhaseBadge phase={phase} />
              </div>
              <div className="text-right">
                <div className={phase === "cancelled" ? "font-display text-xl font-bold text-muted line-through" : "font-display text-xl font-bold"}>{formatTime(s.startsAt)}</div>
                <div className="text-[13px] text-muted">{showClient ? relativeDayLabel(s.startsAt) : `до ${formatTime(s.endsAt)}`}</div>
              </div>
            </ListRow>
          </li>
        );
      })}
    </ul>
  );
}
