"use client";

import { useEffect, useId, useState } from "react";
import clsx from "clsx";

function useMounted(delayMs = 60) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return on;
}

/** Волнистая «поверхность жидкости» сверху заливки. */
function Surface({ color }: { color: string }) {
  return (
    <svg className="absolute -top-[5px] left-0 h-[6px] w-[200%] animate-wave" viewBox="0 0 40 6" preserveAspectRatio="none" aria-hidden>
      <path d="M0 3 Q5 0 10 3 T20 3 T30 3 T40 3 V6 H0 Z" fill={color} />
    </svg>
  );
}

export type PulseDay = { key: string; label: string; day: string; done: number; planned: number; today?: boolean; past?: boolean };

/**
 * «Пульс недели»: 7 капсул. Мятная жидкость — проведённые тренировки,
 * сиреневая — запланированные. Высота заливки зависит от числа занятий.
 */
export function WeekPulse({ days, height = 112 }: { days: PulseDay[]; height?: number }) {
  const on = useMounted();
  const max = Math.max(1, ...days.map((d) => d.planned));
  return (
    <div className="grid grid-cols-7 gap-2" role="img" aria-label={days.map((d) => `${d.label}: ${d.done} из ${d.planned}`).join(", ")}>
      {days.map((d, i) => {
        const doneH = (d.done / max) * 100;
        const planH = (Math.max(d.planned - d.done, 0) / max) * 100;
        return (
          <div key={d.key} className="flex flex-col items-center gap-1.5">
            <div
              className={clsx("relative w-full overflow-hidden rounded-full bg-subtle", d.today && "ring-2 ring-mint/70 ring-offset-2 ring-offset-surface")}
              style={{ height }}
            >
              {/* запланировано */}
              <div
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-lilac/50 to-lilac/25"
                style={{
                  height: `${doneH + planH}%`,
                  transform: on ? "translateY(0)" : "translateY(100%)",
                  transition: `transform 1.1s cubic-bezier(0.34,1.2,0.64,1) ${i * 70}ms`,
                }}
              >
                {planH > 0 && doneH === 0 && <Surface color="rgb(169 155 255 / 0.5)" />}
              </div>
              {/* проведено */}
              <div
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-mint to-[#8ff8dd]"
                style={{
                  height: `${doneH}%`,
                  transform: on ? "translateY(0)" : "translateY(100%)",
                  transition: `transform 1.3s cubic-bezier(0.34,1.2,0.64,1) ${150 + i * 70}ms`,
                }}
              >
                {doneH > 0 && <Surface color="#8ff8dd" />}
              </div>
              {(d.planned > 0 || d.today) && (
                <span className="absolute inset-x-0 top-2 text-center font-display text-[11px] font-semibold text-ink/80">{d.planned || ""}</span>
              )}
            </div>
            <span className={clsx("text-[11px] font-semibold uppercase", d.today ? "text-mint" : "text-muted")}>{d.label}</span>
            <span className={clsx("-mt-1.5 font-display text-[11px]", d.today ? "text-ink" : "text-faint")}>{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Полукруглая шкала с переливом и делениями. */
export function Gauge({ value, max, label, sub, size = 220 }: { value: number; max: number; label: string; sub?: string; size?: number }) {
  const id = useId().replace(/:/g, "");
  const on = useMounted(120);
  const sw = 16;
  const r = size / 2 - sw;
  const cx = size / 2;
  const cy = size / 2;
  const len = Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const ticks = Array.from({ length: 21 }, (_, i) => {
    const a = Math.PI - (i / 20) * Math.PI;
    const r1 = r + sw / 2 + 6;
    const r2 = r1 + (i % 5 === 0 ? 7 : 3);
    return { x1: cx + r1 * Math.cos(a), y1: cy - r1 * Math.sin(a), x2: cx + r2 * Math.cos(a), y2: cy - r2 * Math.sin(a), major: i % 5 === 0 };
  });
  return (
    <div className="relative mx-auto" style={{ width: size + 24, height: size / 2 + 28 }}>
      <svg width={size + 24} height={size / 2 + 28} viewBox={`-12 -12 ${size + 24} ${size / 2 + 28}`} role="img" aria-label={`${label}: ${value} из ${max}`}>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3ef2c5" />
            <stop offset="0.6" stopColor="#a99bff" />
            <stop offset="1" stopColor="#ff7a59" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <line key={i} {...t} stroke="#fff" strokeOpacity={t.major ? 0.28 : 0.12} strokeWidth={t.major ? 2 : 1.5} strokeLinecap="round" />
        ))}
        <path d={arc} fill="none" stroke="#1b2130" strokeWidth={sw} strokeLinecap="round" />
        <path
          d={arc}
          fill="none"
          stroke={`url(#${id}-g)`}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${len} ${len}`}
          strokeDashoffset={on ? len * (1 - pct) : len}
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.34,1.15,0.64,1)" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <div className="font-display text-[2.6rem] font-semibold leading-none">
          {value}
          <span className="text-xl text-muted">/{max}</span>
        </div>
        <div className="mt-1 text-[13px] font-semibold text-muted">{label}</div>
        {sub && <div className="text-[12px] text-faint">{sub}</div>}
      </div>
    </div>
  );
}

/** Горизонтальная капсула-заливка (для БЖУ и прогресса). */
export function Capsule({ value, max, color = "mint", delay = 0 }: { value: number; max: number; color?: "mint" | "coral" | "lilac"; delay?: number }) {
  const on = useMounted(60 + delay * 1000);
  const pct = max > 0 ? Math.min(value / max, 1) * 100 : 0;
  const bg = { mint: "from-mint to-[#8ff8dd]", coral: "from-coral to-[#ffb199]", lilac: "from-lilac to-[#cfc6ff]" }[color];
  return (
    <div className="h-3 overflow-hidden rounded-full bg-subtle">
      <div
        className={clsx("h-full rounded-full bg-gradient-to-r", bg)}
        style={{ width: on ? `${pct}%` : "0%", transition: "width 1.2s cubic-bezier(0.34,1.15,0.64,1)" }}
      />
    </div>
  );
}
