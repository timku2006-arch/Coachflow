import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { buttonClass } from "./button-class";
import { phaseLabel, type SessionPhase } from "@/lib/session-phase";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  return <Link {...props} className={clsx(buttonClass(variant), className)} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 sm:text-sm";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={clsx(inputClass, props.className)} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={clsx(inputClass, props.className)} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={clsx(inputClass, props.className)} />;
}

const phaseColors: Record<SessionPhase, string> = {
  upcoming: "bg-sky-100 text-sky-800",
  in_progress: "bg-amber-100 text-amber-800",
  awaiting_results: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-600 line-through",
};

export function PhaseBadge({ phase }: { phase: SessionPhase }) {
  return (
    <span className={clsx("inline-block rounded-full px-2 py-0.5 text-xs font-medium", phaseColors[phase])}>
      {phaseLabel[phase]}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{children}</p>;
}

export function Stat({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-slate-900">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}
