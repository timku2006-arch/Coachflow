"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FlowWaves } from "./flow-waves";

/**
 * Приветствие сразу после входа: по экрану пробегают волны,
 * появляется имя, затем всё растворяется и открывает приложение.
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
      className="pointer-events-none fixed inset-0 z-50 flex animate-[fade-out_0.6s_cubic-bezier(0.22,1,0.36,1)_2.05s_both] flex-col justify-center bg-canvas px-7"
    >
      <FlowWaves className="absolute inset-x-0 top-[64%] h-44 opacity-60" />
      <div className="relative">
        <div className="animate-rise text-[14px] font-semibold text-muted first-letter:uppercase [animation-delay:0.5s]">{line}</div>
        <div className="mt-2 animate-rise font-display text-[2.4rem] font-semibold leading-[1.08] [animation-delay:0.65s] sm:text-6xl">
          Привет,
          <br />
          <span className="text-flow">{name}</span>
        </div>
        <div className="mt-3 animate-rise text-[15px] text-ink-2 [animation-delay:0.85s]">Поехали ✦</div>
      </div>
    </div>,
    document.body,
  );
}
