"use client";

import { useEffect, useState } from "react";

/** Конфетти в фирменных цветах — один раз при показе рекорда. */
export function Confetti() {
  const [pieces, setPieces] = useState<{ left: number; delay: number; color: string; rotate: number }[]>([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#3ef2c5", "#a99bff", "#ff7a59", "#f3f5fb"];
    setPieces(Array.from({ length: 28 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.4, color: colors[i % colors.length], rotate: Math.random() * 360 })));
  }, []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute -top-3 h-2.5 w-1.5 rounded-sm"
          style={{ left: `${p.left}%`, background: p.color, transform: `rotate(${p.rotate}deg)`, animation: `confetti 1.8s cubic-bezier(0.22,1,0.36,1) ${p.delay}s both` }}
        />
      ))}
    </div>
  );
}
