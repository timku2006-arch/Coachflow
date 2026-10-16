import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireClient } from "@/server/auth";

const items = [
  { href: "/client", label: "Главная", icon: "home" as const, exact: true },
  { href: "/client/schedule", label: "Занятия", icon: "calendar" as const },
  { href: "/client/program", label: "Программа", icon: "program" as const },
  { href: "/client/progress", label: "Прогресс", icon: "progress" as const },
  { href: "/client/profile", label: "Профиль", icon: "user" as const },
];

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const { user } = await requireClient();
  return (
    <AppShell items={items} userName={user.name} home="/client">
      {children}
    </AppShell>
  );
}
