import Link from "next/link";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Logo } from "./logo";
import { NavLinks, type NavItem } from "./nav-links";
import { Avatar } from "./ui";
import { logoutAction } from "@/app/actions/auth";

export function AppShell({ items, userName, home, children }: { items: NavItem[]; userName: string; home: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh pb-28 md:pb-10">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4">
          <Link href={home} className="flex items-center gap-2.5 text-[1.05rem] font-extrabold tracking-tight">
            <Logo className="h-8 w-8 transition-transform duration-300 hover:rotate-[-8deg] hover:scale-105" />
            <span>
              Coach<span className="text-brand-gradient">Flow</span>
            </span>
          </Link>
          <nav className="mx-auto hidden md:block">
            <NavLinks items={items} variant="top" />
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <span className="hidden items-center gap-2 sm:flex">
              <Avatar name={userName} size="sm" />
              <span className="max-w-36 truncate text-sm font-semibold text-ink-2">{userName}</span>
            </span>
            <form action={logoutAction}>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-subtle hover:text-ink active:scale-90"
                aria-label="Выйти"
                title="Выйти"
              >
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <nav className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 rounded-[1.75rem] border border-line/80 bg-surface/85 px-1.5 py-1 shadow-lift backdrop-blur-xl md:hidden">
        <NavLinks items={items} variant="bottom" />
      </nav>
    </div>
  );
}
