"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Rings } from "./rings";

/**
 * Приветствие сразу после входа: кольца замыкаются, появляется имя,
 * затем экран плавно растворяется и открывает приложение.
 */
export function Welcome({ show, name, line }: { show: boolean; name: string; line: string }) {
  const [visible, setVisible] = useState(show);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (!show) return;
    // убираем ?hello=1 из адреса, чтобы приветствие не повторялось при обновлении
    const url = new URL(window.location.href);
    url.searchParams.delete("hello");
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
    const t = setTimeout(() => setVisible(false), 2700);
    return () => clearTimeout(t);
  }, [show]);
  if (!visible || !mounted) return null;
  // Портал в <body>: анимация перехода страницы создаёт свой слой и «запирает» fixed-элементы.
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 flex animate-[fade-out_0.6s_cubic-bezier(0.22,1,0.36,1)_2.05s_both] flex-col items-center justify-center bg-black px-6 text-center"
    >
      <Rings
        size={200}
        rings={[
          { value: 1, max: 1, color: "red" },
          { value: 1, max: 1, color: "green" },
          { value: 1, max: 1, color: "blue" },
        ]}
        delay={0.1}
      />
      <div className="mt-8 animate-rise text-[13px] font-semibold uppercase tracking-wide text-muted [animation-delay:0.7s]">{line}</div>
      <div className="mt-1 animate-rise font-display text-[2rem] font-bold leading-tight [animation-delay:0.85s] sm:text-[2.5rem]">
        <span className="whitespace-nowrap">С возвращением,</span>
        <br />
        <span className="bg-gradient-to-r from-ring-red via-ring-green to-ring-blue bg-clip-text text-transparent">{name}</span>
      </div>
    </div>,
    document.body,
  );
}
