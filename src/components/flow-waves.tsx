import clsx from "clsx";

// Один период волны шириной 200 — повторяем дважды, чтобы бесшовно «течь».
const period = (amp: number, mid: number) => `q 25 ${-amp} 50 0 t 50 0 t 50 0 t 50 0`.replace(/^/, `M 0 ${mid} `);

function Wave({ color, amp, mid, width, speed, opacity, delay }: { color: string; amp: number; mid: number; width: number; speed: number; opacity: number; delay: number }) {
  const d = `${period(amp, mid)} t 50 0 t 50 0 t 50 0 t 50 0`;
  return (
    <div className="absolute inset-0 animate-[reveal-x_1.6s_cubic-bezier(0.22,1,0.36,1)_both]" style={{ animationDelay: `${delay}s` }}>
      <svg className="absolute left-0 top-0 h-full w-[200%]" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden>
        <g className="animate-wave" style={{ animationDuration: `${speed}s` }}>
          <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity} vectorEffect="non-scaling-stroke" />
          <path d={d} fill="none" stroke={color} strokeWidth={width * 6} strokeLinecap="round" opacity={opacity * 0.12} vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    </div>
  );
}

/** Три текущие волны фирменных цветов — «flow» в названии. */
export function FlowWaves({ className }: { className?: string }) {
  return (
    <div className={clsx("pointer-events-none overflow-hidden", className ?? "relative")} aria-hidden>
      <Wave color="#a99bff" amp={22} mid={46} width={3} speed={9} opacity={0.9} delay={0.15} />
      <Wave color="#3ef2c5" amp={30} mid={52} width={4} speed={6.5} opacity={1} delay={0} />
      <Wave color="#ff7a59" amp={16} mid={58} width={2.5} speed={11} opacity={0.85} delay={0.3} />
    </div>
  );
}
