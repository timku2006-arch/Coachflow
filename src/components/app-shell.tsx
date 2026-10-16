import Link from "next/link";
import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import clsx from "clsx";
import { LogoutButton } from "./logout-button";
import { Logo } from "./logo";
import { NavLinks, type NavItem } from "./nav-links";
import { Avatar } from "./ui";

export function AppShell({
  items,
  userName,
  home,
  unread = 0,
  children,
}: {
  items: NavItem[];
  userName: string;
  home: string;
  unread?: number;
  children: ReactNode;
}) {
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
            <Link
              href={`${home}/notifications`}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-subtle hover:text-ink active:scale-90"
              aria-label={unread ? `Уведомления: ${unread} новых` : "Уведомления"}
              title="Уведомления"
            >
              <Bell size={19} className={clsx(unread > 0 && "origin-top animate-[ring_1.2s_ease-in-out_2] text-ink")} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-brand-gradient px-1 text-[10px] font-extrabold text-white ring-2 ring-canvas">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <LogoutButton />
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
