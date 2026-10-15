import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./logo";
import { NavLinks, type NavItem } from "./nav-links";
import { logoutAction } from "@/app/actions/auth";

export function AppShell({ items, userName, home, children }: { items: NavItem[]; userName: string; home: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link href={home} className="flex items-center gap-2 font-semibold">
            <Logo className="h-7 w-7" />
            <span>CoachFlow</span>
          </Link>
          <nav className="hidden flex-1 md:block">
            <NavLinks items={items} variant="top" />
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm md:ml-0">
            <span className="hidden max-w-40 truncate text-slate-500 sm:inline">{userName}</span>
            <form action={logoutAction}>
              <button className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100">Выйти</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <NavLinks items={items} variant="bottom" />
      </nav>
    </div>
  );
}
