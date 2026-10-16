import type { ReactNode } from "react";

/** Пересоздаётся при каждом переходе — даёт плавное появление страницы. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
