"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { KeyRound, LogOut, UserRound } from "lucide-react";
import { Avatar } from "./ui";
import { LogoutButton } from "./logout-button";

const item =
  "flex w-full items-center justify-between gap-3 px-4 py-3 text-[15px] text-ink transition-colors hover:bg-white/10 active:bg-white/15";

/** Аватар пользователя с выпадающим меню: профиль, пароль, выход. */
export function UserMenu({ name, roleLabel, profileHref }: { name: string; roleLabel: string; profileHref: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Меню пользователя"
        className="press flex items-center rounded-full"
      >
        <Avatar name={name} size="sm" />
              </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-64 origin-top-right animate-pop overflow-hidden rounded-2xl bg-[#2c2c2e]/90 shadow-lift backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 border-b border-white/10 p-4">
            <Avatar name={name} />
            <div className="min-w-0">
              <div className="truncate font-semibold">{name}</div>
              <div className="text-[13px] text-muted">{roleLabel}</div>
            </div>
          </div>
          <Link href={profileHref} className={clsx(item, "border-b border-white/10")} role="menuitem">
            Профиль <UserRound size={18} className="text-muted" />
          </Link>
          <Link href="/change-password" className={item} role="menuitem">
            Сменить пароль <KeyRound size={18} className="text-muted" />
          </Link>
          <div className="h-2 bg-black/40" />
          <LogoutButton className={clsx(item, "text-red-600")}>
            Выйти <LogOut size={18} />
          </LogoutButton>
        </div>
      )}
    </div>
  );
}
