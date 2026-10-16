"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/** Обратный отсчёт в стиле табло: «2 ДН 04:12:09», секунды тикают. */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return <span className={className}>&nbsp;</span>;
  const left = Math.max(0, Math.floor((target - now) / 1000));
  if (left === 0) return <span className={className}>Уже началось</span>;
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return (
    <span className={className} suppressHydrationWarning>
      {d > 0 && <>{d}&nbsp;д&nbsp;</>}
      {pad(h)}
      <span className="animate-blink">:</span>
      {pad(m)}
      <span className="animate-blink">:</span>
      <span key={s} className="inline-block animate-[pop_0.35s_cubic-bezier(0.34,1.4,0.64,1)]">
        {pad(s)}
      </span>
    </span>
  );
}
