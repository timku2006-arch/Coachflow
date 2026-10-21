import Link from "next/link";
import clsx from "clsx";
import { Sparkles } from "lucide-react";
import type { PeriodKind } from "@/lib/summary";

/** Итог недели/месяца: заголовок и пара простых строк. */
export function SummaryCard({ text, period, hrefFor }: { text: { headline: string; lines: string[] }; period: PeriodKind; hrefFor: (p: PeriodKind) => string }) {
  return (
    <section className="min-w-0">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Итог</h2>
        <div className="flex rounded-full bg-surface p-1 ring-1 ring-inset ring-white/5">
          {(["week", "month"] as const).map((p) => (
            <Link
              key={p}
              href={hrefFor(p)}
              scroll={false}
              className={clsx("press rounded-full px-4 py-1.5 text-[14px] font-semibold", period === p ? "bg-subtle-2 text-ink" : "text-muted")}
            >
              {p === "week" ? "Неделя" : "Месяц"}
            </Link>
          ))}
        </div>
      </div>
      <div key={period} className="glass animate-pop rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <Sparkles size={22} className="mt-1 shrink-0 text-lilac" />
          <div>
            <p className="font-display text-[1.3rem] font-semibold leading-snug">{text.headline}</p>
            <ul className="mt-2 space-y-1.5">
              {text.lines.map((l) => (
                <li key={l} className="text-[17px] leading-snug text-ink-2">
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
