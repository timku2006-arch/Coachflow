import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { formatDateShort, formatTime, moscowDateString, weekDays, addMoscowDays, toMoscow } from "@/lib/time";
import { sessionPhase, type SessionPhase } from "@/lib/session-phase";

type CalSession = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  client?: { user: { name: string } };
};

const dot: Record<SessionPhase, string> = {
  upcoming: "bg-ring-blue",
  in_progress: "bg-brand-500",
  awaiting_results: "bg-ring-red",
  completed: "bg-brand-500",
  cancelled: "bg-faint",
};

/** Неделя: полоса дней сверху (точки = занятия), ниже — занятия по дням. */
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
  const byDay = (key: string) =>
    [
      ...sessions.filter((s) => moscowDateString(s.startsAt) === key).map((s) => ({ kind: "session" as const, s, t: s.startsAt })),
      ...busy.filter((b) => moscowDateString(b.startsAt) === key).map((b) => ({ kind: "busy" as const, b, t: b.startsAt })),
    ].sort((a, b) => a.t.getTime() - b.t.getTime());
  const navBtn = "press flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink hover:bg-subtle";

  return (
    <div key={moscowDateString(weekStart)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href={navHref(prev)} className={navBtn} aria-label="Предыдущая неделя">
          <ChevronLeft size={20} />
        </Link>
        <div className="text-center">
          <div className="text-[17px] font-semibold">
            {formatDateShort(days[0])} — {formatDateShort(days[6])}
          </div>
          {!isCurrentWeek && (
            <Link href={navHref(today)} className="text-[13px] font-semibold text-brand-500">
              Сегодня
            </Link>
          )}
        </div>
        <Link href={navHref(next)} className={navBtn} aria-label="Следующая неделя">
          <ChevronRight size={20} />
        </Link>
      </div>

      {/* полоса дней */}
      <div className="mb-4 grid animate-pop grid-cols-7 rounded-3xl bg-surface p-2">
        {days.map((day) => {
          const key = moscowDateString(day);
          const z = toMoscow(day);
          const items = byDay(key).filter((x) => x.kind === "session");
          return (
            <a key={key} href={`#d-${key}`} className="press flex flex-col items-center gap-1 py-1">
              <span className={clsx("text-[11px] font-semibold uppercase", key === today ? "text-ring-red" : "text-muted")}>{format(z, "EEEEEE", { locale: ru })}</span>
              <span
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-full font-display text-[17px] font-semibold",
                  key === today ? "bg-ring-red text-white" : "text-ink",
                )}
              >
                {format(z, "d")}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {items.slice(0, 3).map((x) => x.kind === "session" && <span key={x.s.id} className={clsx("h-1.5 w-1.5 rounded-full", dot[sessionPhase(x.s, now)])} />)}
              </span>
            </a>
          );
        })}
      </div>

      {/* занятия по дням */}
      <div className="stagger space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
        {days.map((day) => {
          const key = moscowDateString(day);
          const items = byDay(key);
          const z = toMoscow(day);
          return (
            <section key={key} id={`d-${key}`} className={clsx("scroll-mt-20 rounded-3xl bg-surface p-4", key < today && "opacity-60")}>
              <div className="mb-1 flex items-baseline justify-between">
                <h3 className="text-[15px] font-semibold first-letter:uppercase">{format(z, "EEEE, d MMMM", { locale: ru })}</h3>
                {key === today && <span className="text-[13px] font-semibold text-ring-red">Сегодня</span>}
              </div>
              {items.length === 0 ? (
                <p className="py-1 text-[15px] text-faint">Нет занятий</p>
              ) : (
                <ul className="divide-y divide-line/60">
                  {items.map((it) =>
                    it.kind === "busy" ? (
                      <li key={`b-${it.t.toISOString()}`} className="flex items-center gap-3 py-2.5 text-[15px] text-muted">
                        <span className="h-8 w-1 rounded-full bg-faint" />
                        <span className="font-display font-semibold">{formatTime(it.b.startsAt)}</span>
                        Занято
                      </li>
                    ) : (
                      <li key={it.s.id}>
                        <Link href={sessionHref(it.s.id)} className="press -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-subtle/60">
                          <span className={clsx("h-9 w-1 rounded-full", dot[sessionPhase(it.s, now)])} />
                          <span className={clsx("font-display text-[17px] font-semibold", it.s.status === "CANCELLED" && "text-muted line-through")}>
                            {formatTime(it.s.startsAt)}
                            <span className="text-muted">–{formatTime(it.s.endsAt)}</span>
                          </span>
                          {showClient && it.s.client && <span className="min-w-0 flex-1 truncate text-[15px] text-ink-2">{it.s.client.user.name}</span>}
                          <ChevronRight size={16} className="ml-auto shrink-0 text-faint" />
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
