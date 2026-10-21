import { Ticket } from "lucide-react";
import clsx from "clsx";
import { formatDate, moscowDateString } from "@/lib/time";
import { daysLeft, isExpiringSoon, isLow, remainingText } from "@/lib/membership";

type M = { remainingSessions: number; totalSessions: number; validUntil: string; validFrom: string; paidAt: Date | null };

/** Остаток по абонементу — крупно, без лишних цифр. */
export function MembershipCard({ membership, now = new Date() }: { membership: M | null; now?: Date }) {
  if (!membership) return null;
  const today = moscowDateString(now);
  const expired = daysLeft(membership.validUntil, today) < 0;
  const warn = expired || membership.remainingSessions <= 0 || isLow(membership.remainingSessions) || isExpiringSoon(membership.validUntil, today);
  const pct = Math.max(0, Math.min(1, membership.remainingSessions / membership.totalSessions));
  return (
    <section className={clsx("glass mb-5 animate-rise rounded-[2rem] p-5", warn && "ring-1 ring-coral/40")}>
      <div className="flex items-center gap-3">
        <span className={clsx("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", warn ? "bg-coral/15 text-coral" : "bg-mint/15 text-mint")}>
          <Ticket size={26} />
        </span>
        <div>
          <div className="font-display text-[1.6rem] font-semibold leading-tight">{expired ? "Абонемент закончился" : remainingText(membership.remainingSessions)}</div>
          <div className="text-[15px] text-muted">{expired ? "Скажите тренеру, чтобы продлить" : `до ${formatDate(new Date(`${membership.validUntil}T12:00:00Z`))}`}</div>
        </div>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-subtle">
        <div className={clsx("h-full rounded-full", warn ? "bg-coral" : "bg-gradient-to-r from-mint to-lilac")} style={{ width: `${pct * 100}%` }} />
      </div>
      {warn && !expired && <p className="mt-3 text-[15px] font-semibold text-coral">Пора продлить — скажите тренеру</p>}
    </section>
  );
}
