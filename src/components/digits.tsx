"use client";

import { useEffect, useState } from "react";

/**
 * Число в стиле табло: каждая цифра «прокручивается» барабаном до нужной.
 */
export function Digits({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const text = value.toLocaleString("ru-RU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {[...text].map((ch, i) => {
        const d = Number(ch);
        if (!/\d/.test(ch)) {
          return (
            <span key={i} aria-hidden className="inline-block">
              {ch === " " || ch === " " ? " " : ch}
            </span>
          );
        }
        return (
          <span key={i} aria-hidden className="relative inline-block h-[1em] select-none overflow-hidden align-[-0.12em] leading-none">
            <span
              className="flex flex-col transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: `translateY(-${mounted ? d * 10 : 0}%)`, transitionDelay: `${i * 70}ms` }}
            >
              {Array.from({ length: 10 }, (_, n) => (
                <span key={n} className="block h-[1em] leading-none">
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
