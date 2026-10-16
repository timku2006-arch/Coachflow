import type { ReactNode } from "react";
import { FlowWaves } from "@/components/flow-waves";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden px-5 pb-10 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
      <FlowWaves className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+15.5rem)] h-36 opacity-80" />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-start">
        <Logo animated className="h-14 w-14 animate-pop" />
        <h1 className="mt-6 animate-rise font-display text-[2.4rem] font-semibold leading-[1.05] [animation-delay:0.35s]">
          coach<span className="text-flow">flow</span>
        </h1>
        <p className="mt-2 max-w-xs animate-rise text-[15px] text-muted [animation-delay:0.5s]">Тренер и клиенты в одном ритме: расписание, программы и прогресс.</p>
      </div>
      <div className="glass relative z-10 mt-40 w-full max-w-sm animate-rise rounded-[2rem] p-5 [animation-delay:0.7s]">{children}</div>
    </main>
  );
}
