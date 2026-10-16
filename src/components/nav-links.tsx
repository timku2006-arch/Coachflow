"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { CalendarDays, ClipboardList, Dumbbell, House, Settings, TrendingUp, UserRound, Users } from "lucide-react";

const icons = { home: House, calendar: CalendarDays, users: Users, dumbbell: Dumbbell, settings: Settings, program: ClipboardList, progress: TrendingUp, user: UserRound };
export type IconName = keyof typeof icons;
export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "top" | "bottom" }) {
  const pathname = usePathname();
  const isActive = (i: NavItem) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"));

  if (variant === "top")
    return (
      <ul className="flex gap-1 rounded-2xl bg-subtle p-1">
        {items.map((i) => {
          const Icon = icons[i.icon];
          const active = isActive(i);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                className={clsx(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-200",
                  active ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink",
                )}
              >
                <Icon size={16} strokeWidth={2.2} className={active ? "text-brand-600" : ""} />
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );

  return (
    <ul className="grid gap-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((i) => {
        const Icon = icons[i.icon];
        const active = isActive(i);
        return (
          <li key={i.href}>
            <Link href={i.href} className="group flex flex-col items-center gap-1 py-1.5 text-[10.5px] font-semibold">
              <span
                className={clsx(
                  "flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300 ease-out",
                  active ? "bg-brand-gradient text-white shadow-glow" : "text-muted group-active:scale-90",
                )}
              >
                <Icon size={19} strokeWidth={2.2} className={clsx("transition-transform duration-300", active && "scale-110")} />
              </span>
              <span className={clsx("transition-colors", active ? "text-ink" : "text-muted")}>{i.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
