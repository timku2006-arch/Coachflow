import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <Logo className="h-10 w-10" />
        <span className="text-2xl font-semibold tracking-tight">CoachFlow</span>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
    </main>
  );
}
