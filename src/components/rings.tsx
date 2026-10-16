"use client";

import { useEffect, useId, useState } from "react";

export type Ring = { value: number; max: number; color: "red" | "green" | "blue" };

const palette = {
  red: ["#ff2d55", "#ff6b8b"],
  green: ["#a3f93b", "#d2ff7a"],
  blue: ["#1ee5ff", "#7ef3ff"],
} as const;

/**
 * Концентрические кольца прогресса. При появлении «замыкаются» с пружинной анимацией.
 * Если прогресс больше 100% — кольцо делает второй круг поверх первого.
 */
export function Rings({ rings, size = 160, stroke, delay = 0, className }: { rings: Ring[]; size?: number; stroke?: number; delay?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const sw = stroke ?? Math.round(size / 9);
  const gap = Math.max(2, Math.round(sw / 6));
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60 + delay * 1000);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={rings.map((r) => `${r.value} из ${r.max}`).join(", ")}>
      <defs>
        {rings.map((r, i) => (
          <linearGradient key={i} id={`${id}-g${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette[r.color][0]} />
            <stop offset="100%" stopColor={palette[r.color][1]} />
          </linearGradient>
        ))}
      </defs>
      {rings.map((r, i) => {
        const radius = size / 2 - sw / 2 - i * (sw + gap);
        if (radius <= sw / 2) return null;
        const c = 2 * Math.PI * radius;
        const pct = r.max > 0 ? Math.min(r.value / r.max, 1.999) : 0;
        const dash = on ? Math.max(pct, 0.0001) * c : 0;
        return (
          <g key={i} transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={palette[r.color][0]} strokeOpacity={0.2} strokeWidth={sw} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#${id}-g${i})`}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c * 2}`}
              style={{ transition: `stroke-dasharray 1.6s cubic-bezier(0.34, 1.2, 0.64, 1) ${i * 0.15}s` }}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** Подпись к кольцу: цветное значение «3/5». */
export function RingLegend({ items }: { items: { label: string; value: number; max: number; unit?: string; color: Ring["color"] }[] }) {
  const cls = { red: "text-ring-red", green: "text-ring-green", blue: "text-ring-blue" };
  return (
    <dl className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-[13px] font-semibold text-ink">{it.label}</dt>
          <dd className={`font-display text-2xl font-bold leading-tight ${cls[it.color]}`}>
            {it.value}/{it.max}
            {it.unit && <span className="ml-1 text-base font-semibold">{it.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
