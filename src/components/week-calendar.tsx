import Link from "next/link";
import clsx from "clsx";
import { formatTimeRange, formatWeekday, moscowDateString, weekDays, addMoscowDays, formatDateShort } from "@/lib/time";
import { sessionPhase } from "@/lib/session-phase";
import { PhaseBadge } from "./ui";

type CalSession = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  client?: { user: { name: string } };
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
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href={navHref(prev)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-white" aria-label="Предыдущая неделя">
          ← Пред.
        </Link>
        <div className="text-center text-sm font-medium">
          {formatDateShort(days[0])} — {formatDateShort(days[6])}
          <Link href={navHref(today)} className="ml-2 text-xs font-normal text-brand-700 hover:underline">
            сегодня
          </Link>
        </div>
        <Link href={navHref(next)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-white" aria-label="Следующая неделя">
          След. →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
        {days.map((day) => {
          const key = moscowDateString(day);
          const items = [
            ...sessions.filter((s) => moscowDateString(s.startsAt) === key).map((s) => ({ kind: "session" as const, s })),
            ...busy.filter((b) => moscowDateString(b.startsAt) === key).map((b) => ({ kind: "busy" as const, b })),
          ].sort((a, b) => (a.kind === "session" ? a.s : a.b).startsAt.getTime() - (b.kind === "session" ? b.s : b.b).startsAt.getTime());
          return (
            <div
              key={key}
              className={clsx(
                "min-h-0 rounded-xl border bg-white p-2 md:min-h-40",
                key === today ? "border-brand-500 ring-1 ring-brand-200" : "border-slate-200",
              )}
            >
              <div className={clsx("mb-1.5 text-xs font-medium first-letter:uppercase", key === today ? "text-brand-700" : "text-slate-500")}>
                {formatWeekday(day)}
              </div>
              {items.length === 0 && <div className="text-xs text-slate-300 md:hidden">—</div>}
              <ul className="space-y-1.5">
                {items.map((it) =>
                  it.kind === "session" ? (
                    <li key={it.s.id}>
                      <Link
                        href={sessionHref(it.s.id)}
                        className={clsx(
                          "block rounded-lg border px-2 py-1.5 text-xs hover:border-brand-500",
                          it.s.status === "CANCELLED" ? "border-slate-200 bg-slate-50 text-slate-400" : "border-brand-100 bg-brand-50",
                        )}
                      >
                        <div className="font-semibold">{formatTimeRange(it.s.startsAt, it.s.endsAt)}</div>
                        {showClient && it.s.client && <div className="truncate">{it.s.client.user.name}</div>}
                        <div className="mt-0.5">
                          <PhaseBadge phase={sessionPhase(it.s, now)} />
                        </div>
                      </Link>
                    </li>
                  ) : (
                    <li key={`busy-${it.b.startsAt.toISOString()}`} className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs text-slate-500">
                      <div className="font-medium">{formatTimeRange(it.b.startsAt, it.b.endsAt)}</div>
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
