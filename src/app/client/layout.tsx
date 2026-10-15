import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireClient } from "@/server/auth";

const items = [
  { href: "/client", label: "Главная", icon: "🏠", exact: true },
  { href: "/client/schedule", label: "Занятия", icon: "📅" },
  { href: "/client/program", label: "Программа", icon: "📋" },
  { href: "/client/progress", label: "Прогресс", icon: "📈" },
  { href: "/client/profile", label: "Профиль", icon: "👤" },
];

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const { user } = await requireClient();
  return (
    <AppShell items={items} userName={user.name} home="/client">
      {children}
    </AppShell>
  );
}
