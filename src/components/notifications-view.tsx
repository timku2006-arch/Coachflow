import Link from "next/link";
import clsx from "clsx";
import { Bell, CalendarClock, CalendarPlus, CalendarX2, ClipboardList, Dumbbell, Flame, PartyPopper } from "lucide-react";
import type { Notification } from "@prisma/client";
import { Card, Empty } from "./ui";
import { PushSetup } from "./push-setup";
import { MarkRead } from "./mark-read";
import { formatTime, relativeDayLabel } from "@/lib/time";

const icons: Record<string, { icon: typeof Bell; tone: string }> = {
  session_booked: { icon: CalendarPlus, tone: "bg-mint text-[#0a0d14]" },
  session_rescheduled: { icon: CalendarClock, tone: "bg-amber-700 text-[#0a0d14]" },
  session_cancelled: { icon: CalendarX2, tone: "bg-coral text-[#0a0d14]" },
  session_reminder: { icon: Bell, tone: "bg-lilac text-[#0a0d14]" },
  results_ready: { icon: Dumbbell, tone: "bg-mint text-[#0a0d14]" },
  program_updated: { icon: ClipboardList, tone: "bg-lilac text-[#0a0d14]" },
  nutrition_updated: { icon: Flame, tone: "bg-coral text-[#0a0d14]" },
  test: { icon: PartyPopper, tone: "bg-mint text-[#0a0d14]" },
};

/** Лента уведомлений + настройка push. Общая для тренера и клиента. */
export function NotificationsView({ items, publicKey }: { items: Notification[]; publicKey: string }) {
  const hasUnread = items.some((n) => !n.readAt);
  return (
    <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
      <Card title="Последние">
        {items.length === 0 ? (
          <Empty icon={<Bell size={28} />}>Здесь появятся напоминания, переносы, отмены и новости о тренировках</Empty>
        ) : (
          <ul className="stagger divide-y divide-line/60">
            {items.map((n) => {
              const meta = icons[n.type] ?? icons.test;
              const Icon = meta.icon;
              const inner = (
                <>
                  <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.tone)}>
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold leading-snug">{n.title}</span>
                      <span className="shrink-0 pt-0.5 text-[13px] text-muted">
                        {relativeDayLabel(n.createdAt)}, {formatTime(n.createdAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[15px] text-muted">{n.body}</span>
                  </span>
                  {!n.readAt && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-lilac" aria-label="Новое" />}
                </>
              );
              const cls = clsx(
                "flex gap-3 py-3 transition-colors duration-300",
                n.url && "press -mx-2 rounded-xl px-2 hover:bg-subtle/60",
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
      <Card title="Push на телефон" className="self-start">
        <p className="mb-3 text-sm text-muted">Уведомления придут, даже когда приложение закрыто.</p>
        <PushSetup publicKey={publicKey} />
      </Card>
      {hasUnread && <MarkRead />}
    </div>
  );
}
