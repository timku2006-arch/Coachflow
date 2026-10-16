import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireTrainer } from "@/server/auth";

const items = [
  { href: "/trainer", label: "Главная", icon: "home" as const, exact: true },
  { href: "/trainer/schedule", label: "Расписание", icon: "calendar" as const },
  { href: "/trainer/clients", label: "Клиенты", icon: "users" as const },
  { href: "/trainer/exercises", label: "Упражнения", icon: "dumbbell" as const },
  { href: "/trainer/profile", label: "Профиль", icon: "settings" as const },
];

export default async function TrainerLayout({ children }: { children: ReactNode }) {
  const { user } = await requireTrainer();
  return (
    <AppShell items={items} userName={user.name} home="/trainer">
      {children}
    </AppShell>
  );
}
