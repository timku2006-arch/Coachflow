import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateShort, formatTimeRange, moscowDateString, weekDays, addMoscowDays, toMoscow } from "@/lib/time";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { sessionPhase, type SessionPhase } from "@/lib/session-phase";

type CalSession = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  client?: { user: { name: string } };
};

const bar: Record<SessionPhase, string> = {
  upcoming: "before:bg-brand-500",
  in_progress: "before:bg-amber-500",
  awaiting_results: "before:bg-orange-500",
  completed: "before:bg-emerald-500",
  cancelled: "before:bg-faint",
};

/** Недельный календарь: на телефоне — список по дням, на широком экране — 7 колонок. */
export function WeekCalendar({
  weekStart,
  sessions,
  busy = [],
  sessionHref,
  navHref,
  showClient,
}: {
  weekStart: Date;
  sessions: CalSession[];
  busy?: { startsAt: Date; endsAt: Date }[];
  sessionHref: (id: string) => string;
  navHref: (week: string) => string;
  showClient?: boolean;
}) {
  const days = weekDays(weekStart);
  const today = moscowDateString(new Date());
  const now = new Date();
  const prev = moscowDateString(addMoscowDays(weekStart, -7));
  const next = moscowDateString(addMoscowDays(weekStart, 7));
  const isCurrentWeek = days.some((d) => moscowDateString(d) === today);
  const navBtn = "flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-surface text-ink-2 shadow-soft transition hover:-translate-y-0.5 hover:text-ink active:scale-95";
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={navHref(prev)} className={navBtn} aria-label="Предыдущая неделя">
          <ChevronLeft size={18} />
        </Link>
        <div className="text-center">
          <div className="text-sm font-extrabold tracking-tight">
            {formatDateShort(days[0])} — {formatDateShort(days[6])}
          </div>
          {!isCurrentWeek && (
            <Link href={navHref(today)} className="text-xs font-semibold text-brand-700 hover:underline">
              к текущей неделе
            </Link>
          )}
        </div>
        <Link href={navHref(next)} className={navBtn} aria-label="Следующая неделя">
          <ChevronRight size={18} />
        </Link>
      </div>
      <div key={moscowDateString(weekStart)} className="stagger grid grid-cols-1 gap-2 md:grid-cols-7">
        {days.map((day) => {
          const key = moscowDateString(day);
          const isToday = key === today;
          const items = [
            ...sessions.filter((s) => moscowDateString(s.startsAt) === key).map((s) => ({ kind: "session" as const, s })),
            ...busy.filter((b) => moscowDateString(b.startsAt) === key).map((b) => ({ kind: "busy" as const, b })),
          ].sort((a, b) => (a.kind === "session" ? a.s : a.b).startsAt.getTime() - (b.kind === "session" ? b.s : b.b).startsAt.getTime());
          const z = toMoscow(day);
          return (
            <div
              key={key}
              className={clsx(
                "flex gap-3 rounded-3xl border p-2.5 md:min-h-44 md:flex-col md:gap-2",
                isToday ? "border-brand-300 bg-brand-50/60 ring-4 ring-brand-100" : "border-line bg-surface",
              )}
            >
              <div className="flex w-11 shrink-0 flex-col items-center md:w-auto md:flex-row md:gap-1.5 md:px-1">
                <span className={clsx("text-[11px] font-bold uppercase", isToday ? "text-brand-700" : "text-muted")}>{format(z, "EEEEEE", { locale: ru })}</span>
                <span
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold",
                    isToday ? "bg-brand-gradient text-white shadow-glow" : "text-ink",
                  )}
                >
                  {format(z, "d")}
                </span>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {items.length === 0 && <li className="flex h-full items-center text-xs text-faint md:hidden">Свободно</li>}
                {items.map((it) =>
                  it.kind === "session" ? (
                    <li key={it.s.id}>
                      {(() => {
                        const phase = sessionPhase(it.s, now);
                        return (
                          <Link
                            href={sessionHref(it.s.id)}
                            className={clsx(
                              "relative block overflow-hidden rounded-xl border border-line bg-surface py-1.5 pl-3 pr-2 text-xs shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift",
                              "before:absolute before:inset-y-0 before:left-0 before:w-1",
                              bar[phase],
                              phase === "cancelled" && "opacity-60",
                            )}
                          >
                            <div className={clsx("font-extrabold", phase === "cancelled" && "line-through")}>{formatTimeRange(it.s.startsAt, it.s.endsAt)}</div>
                            {showClient && it.s.client && <div className="truncate font-medium text-ink-2">{it.s.client.user.name}</div>}
                          </Link>
                        );
                      })()}
                    </li>
                  ) : (
                    <li
                      key={`busy-${it.b.startsAt.toISOString()}`}
                      className="rounded-xl bg-[repeating-linear-gradient(135deg,var(--c-subtle)_0_6px,var(--c-subtle-2)_6px_12px)] px-2.5 py-1.5 text-xs text-muted"
                    >
                      <div className="font-bold">{formatTimeRange(it.b.startsAt, it.b.endsAt)}</div>
                      Занято
                    </li>
                  ),
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
