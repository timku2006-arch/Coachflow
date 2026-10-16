"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { CalendarDays, ClipboardList, Dumbbell, House, Settings, TrendingUp, UserRound, Users } from "lucide-react";

const icons = { home: House, calendar: CalendarDays, users: Users, dumbbell: Dumbbell, settings: Settings, program: ClipboardList, progress: TrendingUp, user: UserRound };
export type IconName = keyof typeof icons;
export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };

/** Нижний таб-бар (телефон, планшет) и сегментированное меню (компьютер). */
export function NavLinks({ items, variant }: { items: NavItem[]; variant: "top" | "bottom" }) {
  const pathname = usePathname();
  const active = items.findIndex((i) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/")));

  if (variant === "top")
    return (
      <ul className="relative flex rounded-full bg-surface p-1">
        {items.map((i, idx) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className={clsx(
                "press block rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors duration-300",
                idx === active ? "bg-subtle-2 text-ink" : "text-muted hover:text-ink",
              )}
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((i, idx) => {
        const Icon = icons[i.icon];
        const on = idx === active;
        return (
          <li key={i.href}>
            <Link href={i.href} className="flex flex-col items-center gap-1 pb-1 pt-2 active:opacity-60">
              <Icon
                key={on ? "on" : "off"}
                size={24}
                strokeWidth={on ? 2.3 : 1.8}
                className={clsx("transition-colors duration-200", on ? "animate-pop text-brand-500" : "text-muted")}
              />
              <span className={clsx("text-[10px] font-medium", on ? "text-brand-500" : "text-muted")}>{i.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
