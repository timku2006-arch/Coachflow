import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireTrainer } from "@/server/auth";
import { unreadCount } from "@/server/services/notifications";
import type { NavItem } from "@/components/nav-links";

const items: NavItem[] = [
  { href: "/trainer", label: "Главная", icon: "home", exact: true },
  { href: "/trainer/schedule", label: "Расписание", icon: "calendar" },
  { href: "/trainer/schedule#new", label: "Записать клиента", icon: "plus", action: true },
  { href: "/trainer/clients", label: "Клиенты", icon: "users" },
  { href: "/trainer/exercises", label: "Упражнения", icon: "dumbbell" },
];

export default async function TrainerLayout({ children }: { children: ReactNode }) {
  const { user } = await requireTrainer();
  const unread = await unreadCount(user.id);
  return (
    <AppShell items={items} userName={user.name} roleLabel="Тренер" home="/trainer" unread={unread}>
      {children}
    </AppShell>
  );
}
