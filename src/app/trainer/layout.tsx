import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireTrainer } from "@/server/auth";

const items = [
  { href: "/trainer", label: "Главная", icon: "🏠", exact: true },
  { href: "/trainer/schedule", label: "Расписание", icon: "📅" },
  { href: "/trainer/clients", label: "Клиенты", icon: "👥" },
  { href: "/trainer/exercises", label: "Упражнения", icon: "🏋️" },
  { href: "/trainer/profile", label: "Профиль", icon: "⚙️" },
];

export default async function TrainerLayout({ children }: { children: ReactNode }) {
  const { user } = await requireTrainer();
  return (
    <AppShell items={items} userName={user.name} home="/trainer">
      {children}
    </AppShell>
  );
}
