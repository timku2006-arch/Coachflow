import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireClient } from "@/server/auth";
import { unreadCount } from "@/server/services/notifications";
import type { NavItem } from "@/components/nav-links";

const items: NavItem[] = [
  { href: "/client", label: "Главная", icon: "home", exact: true },
  { href: "/client/schedule", label: "Занятия", icon: "calendar" },
  { href: "/client/schedule#new", label: "Записаться", icon: "plus", action: true },
  { href: "/client/program", label: "Программа", icon: "program" },
  { href: "/client/progress", label: "Прогресс", icon: "progress" },
];

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const { user } = await requireClient();
  const unread = await unreadCount(user.id);
  return (
    <AppShell items={items} userName={user.name} roleLabel="Клиент" home="/client" unread={unread}>
      {children}
    </AppShell>
  );
}
