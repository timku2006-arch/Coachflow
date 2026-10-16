import Link from "next/link";
import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import clsx from "clsx";
import { Wordmark } from "./logo";
import { NavLinks, type NavItem } from "./nav-links";
import { UserMenu } from "./user-menu";

export function AppShell({
  items,
  userName,
  roleLabel,
  home,
  unread = 0,
  children,
}: {
  items: NavItem[];
  userName: string;
  roleLabel: string;
  home: string;
  unread?: number;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh pb-28 lg:pb-12">
      <header className="sticky top-0 z-30 bg-canvas/70 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link href={home} className="press shrink-0 text-lg" aria-label="CoachFlow — на главную">
            <Wordmark />
          </Link>
          <nav className="mx-auto hidden min-w-0 lg:block">
            <NavLinks items={items} variant="top" />
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
            <Link
              href={`${home}/notifications`}
              className="press relative flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink hover:bg-subtle"
              aria-label={unread ? `Уведомления: ${unread} новых` : "Уведомления"}
              title="Уведомления"
            >
              <Bell size={18} className={clsx(unread > 0 && "origin-top animate-[ring_1.2s_ease-in-out_2]")} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-ring-red px-1 text-[11px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <UserMenu name={userName} roleLabel={roleLabel} profileHref={`${home}/profile`} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-6 pt-3">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#121212]/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden">
        <div className="mx-auto max-w-lg">
          <NavLinks items={items} variant="bottom" />
        </div>
      </nav>
    </div>
  );
}
