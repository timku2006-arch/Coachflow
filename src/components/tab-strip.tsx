"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Горизонтальная лента вкладок: край плавно гаснет (видно, что её можно листать),
 * а активная вкладка сама прокручивается в поле зрения.
 */
export function TabStrip({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active) nav.scrollLeft = active.offsetLeft - nav.clientWidth / 2 + active.offsetWidth / 2;
  }, []);
  return (
    <nav
      ref={ref}
      aria-label={label}
      className="-mx-4 mb-5 overflow-x-auto pl-4 pr-10 [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-40px),transparent)] [scrollbar-width:none] md:mx-0 md:px-0 md:[mask-image:none]"
    >
      {children}
    </nav>
  );
}
