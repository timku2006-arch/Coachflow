"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { CalendarDays, ClipboardList, Dumbbell, House, Plus, Settings, TrendingUp, UserRound, Users } from "lucide-react";

const icons = { home: House, calendar: CalendarDays, users: Users, dumbbell: Dumbbell, settings: Settings, program: ClipboardList, progress: TrendingUp, user: UserRound, plus: Plus };
export type IconName = keyof typeof icons;
export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean; action?: boolean };

/** Нижнее меню с центральной кнопкой действия и верхнее меню для широких экранов. */
export function NavLinks({ items, variant }: { items: NavItem[]; variant: "top" | "bottom" }) {
  const pathname = usePathname();
  const isActive = (i: NavItem) => !i.action && (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"));

  if (variant === "top")
    return (
      <ul className="flex items-center gap-1">
        {items
          .filter((i) => !i.action)
          .map((i) => {
            const on = isActive(i);
            return (
              <li key={i.href}>
                <Link
                  href={i.href}
                  className={clsx("press relative block rounded-full px-3.5 py-2 text-[14px] font-semibold transition-colors", on ? "text-ink" : "text-muted hover:text-ink")}
                >
                  {i.label}
                  <span
                    className={clsx(
                      "absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-mint transition-all duration-300",
                      on ? "scale-100 opacity-100" : "scale-0 opacity-0",
                    )}
                  />
                </Link>
              </li>
            );
          })}
      </ul>
    );

  return (
    <ul className="grid items-end" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((i) => {
        const Icon = icons[i.icon];
        if (i.action)
          return (
            <li key={i.href} className="flex justify-center">
              <Link
                href={i.href}
                aria-label={i.label}
                className="press -mt-6 flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br from-mint via-[#7cd9f0] to-lilac text-on-brand shadow-glow ring-4 ring-canvas"
              >
                <Plus size={26} strokeWidth={2.6} />
              </Link>
            </li>
          );
        const on = isActive(i);
        return (
          <li key={i.href}>
            <Link href={i.href} className="flex flex-col items-center gap-1 pb-1.5 pt-2.5 active:opacity-60">
              <Icon key={on ? "on" : "off"} size={22} strokeWidth={on ? 2.3 : 1.8} className={clsx("transition-colors", on ? "animate-pop text-mint" : "text-muted")} />
              <span className={clsx("text-[10px] font-semibold", on ? "text-ink" : "text-muted")}>{i.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
