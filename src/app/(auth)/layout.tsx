import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* живой градиентный фон */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-80 w-80 animate-float rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-72 w-72 animate-float rounded-full bg-fuchsia-500/20 blur-3xl [animation-delay:-5s]" />
        <div className="absolute -bottom-24 left-1/4 h-80 w-80 animate-float rounded-full bg-[#c8f169]/20 blur-3xl [animation-delay:-9s]" />
      </div>
      <div className="mb-8 flex animate-pop flex-col items-center gap-3 text-center">
        <Logo className="h-16 w-16 drop-shadow-[0_12px_30px_rgb(106_69_245_/_0.45)]" />
        <div>
          <div className="text-3xl font-extrabold tracking-tight">
            Coach<span className="text-brand-gradient">Flow</span>
          </div>
          <p className="mt-1 text-sm text-muted">Тренировки, прогресс и расписание — в одном месте</p>
        </div>
      </div>
      <div className="w-full max-w-sm animate-rise rounded-[2rem] border border-line bg-surface/80 p-6 shadow-lift backdrop-blur-xl [animation-delay:0.08s]">
        {children}
      </div>
    </main>
  );
}
