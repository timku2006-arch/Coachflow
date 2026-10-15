"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export type NavItem = { href: string; label: string; icon: string; exact?: boolean };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "top" | "bottom" }) {
  const pathname = usePathname();
  const isActive = (i: NavItem) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"));
  if (variant === "top")
    return (
      <ul className="flex gap-1">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-sm",
                isActive(i) ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-100",
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
      {items.map((i) => (
        <li key={i.href}>
          <Link
            href={i.href}
            className={clsx("flex flex-col items-center gap-0.5 py-2 text-[11px]", isActive(i) ? "text-brand-700" : "text-slate-500")}
          >
            <span className="text-lg leading-none" aria-hidden>
              {i.icon}
            </span>
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
