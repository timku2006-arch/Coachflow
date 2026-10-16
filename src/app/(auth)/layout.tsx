import type { ReactNode } from "react";
import { Rings } from "@/components/rings";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden px-5 pb-10 pt-[calc(env(safe-area-inset-top)+3rem)]">
      {/* мягкое свечение цветов колец за знаком */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-24 -z-0 h-72 w-72 -translate-x-1/2">
        <div className="absolute -left-10 top-0 h-48 w-48 animate-breathe rounded-full bg-ring-red/25 blur-3xl" />
        <div className="absolute -right-6 top-6 h-44 w-44 animate-breathe rounded-full bg-ring-green/20 blur-3xl [animation-delay:-1s]" />
        <div className="absolute left-12 top-20 h-40 w-40 animate-breathe rounded-full bg-ring-blue/20 blur-3xl [animation-delay:-2s]" />
      </div>
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="animate-[spin-in_1s_cubic-bezier(0.34,1.4,0.64,1)_both]">
          <Rings
            size={168}
            rings={[
              { value: 82, max: 100, color: "red" },
              { value: 64, max: 100, color: "green" },
              { value: 91, max: 100, color: "blue" },
            ]}
            delay={0.25}
          />
        </div>
        <h1 className="mt-7 animate-rise font-display text-[2.5rem] font-bold leading-none [animation-delay:0.5s]">CoachFlow</h1>
        <p className="mt-2 max-w-xs animate-rise text-[15px] text-muted [animation-delay:0.62s]">Тренировки, прогресс и расписание — в одном месте</p>
      </div>
      <div className="relative z-10 mt-9 w-full max-w-sm animate-rise rounded-3xl bg-surface p-5 [animation-delay:0.75s]">{children}</div>
    </main>
  );
}
