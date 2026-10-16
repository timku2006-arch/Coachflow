import Link from "next/link";
import clsx from "clsx";
import { Bell, CalendarClock, CalendarPlus, CalendarX2, ClipboardList, Dumbbell, Flame, PartyPopper } from "lucide-react";
import type { Notification } from "@prisma/client";
import { Card, Empty } from "./ui";
import { PushSetup } from "./push-setup";
import { MarkRead } from "./mark-read";
import { formatTime, relativeDayLabel } from "@/lib/time";

const icons: Record<string, { icon: typeof Bell; tone: string }> = {
  session_booked: { icon: CalendarPlus, tone: "bg-brand-50 text-brand-700" },
  session_rescheduled: { icon: CalendarClock, tone: "bg-amber-100 text-amber-800" },
  session_cancelled: { icon: CalendarX2, tone: "bg-red-50 text-red-700" },
  session_reminder: { icon: Bell, tone: "bg-sky-100 text-sky-800" },
  results_ready: { icon: Dumbbell, tone: "bg-emerald-100 text-emerald-800" },
  program_updated: { icon: ClipboardList, tone: "bg-brand-50 text-brand-700" },
  nutrition_updated: { icon: Flame, tone: "bg-orange-100 text-orange-800" },
  test: { icon: PartyPopper, tone: "bg-brand-50 text-brand-700" },
};

/** Лента уведомлений + настройка push. Общая для тренера и клиента. */
export function NotificationsView({ items, publicKey }: { items: Notification[]; publicKey: string }) {
  const hasUnread = items.some((n) => !n.readAt);
  return (
    <div className="stagger grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card title="Последние" icon={<Bell size={15} />}>
        {items.length === 0 ? (
          <Empty icon={<Bell size={28} />}>Здесь появятся напоминания, переносы, отмены и новости о тренировках</Empty>
        ) : (
          <ul className="stagger -mx-1 space-y-1">
            {items.map((n) => {
              const meta = icons[n.type] ?? icons.test;
              const Icon = meta.icon;
              const inner = (
                <>
                  <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", meta.tone)}>
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-bold leading-snug">{n.title}</span>
                      <span className="shrink-0 pt-0.5 text-[11px] font-semibold text-muted">
                        {relativeDayLabel(n.createdAt)}, {formatTime(n.createdAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-2">{n.body}</span>
                  </span>
                  {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Новое" />}
                </>
              );
              const cls = clsx(
                "flex gap-3 rounded-2xl px-2 py-2.5 transition-all duration-200",
                !n.readAt && "bg-brand-50/60",
                n.url && "hover:bg-subtle active:scale-[0.99]",
              );
              return (
                <li key={n.id}>
                  {n.url ? (
                    <Link href={n.url} className={cls}>
                      {inner}
                    </Link>
                  ) : (
                    <div className={cls}>{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card title="Push на телефон" icon={<Bell size={15} />} className="self-start">
        <p className="mb-3 text-sm text-muted">Уведомления придут, даже когда приложение закрыто.</p>
        <PushSetup publicKey={publicKey} />
      </Card>
      {hasUnread && <MarkRead />}
    </div>
  );
}
