import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { buttonClass } from "./button-class";
import { inputClass } from "./input-class";
import { phaseLabel, type SessionPhase } from "@/lib/session-phase";

export function PageHeader({ title, subtitle, action, eyebrow }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{eyebrow}</div>}
        <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <div className="mt-1.5 text-sm text-muted">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className,
  icon,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <section className={clsx("rounded-3xl border border-line bg-surface p-4 shadow-soft sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && (
            <h2 className="flex items-center gap-2 text-[0.95rem] font-bold text-ink">
              {icon && <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>}
              {title}
            </h2>
          )}
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

/** Небольшая ссылка «ещё» в шапке карточки */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50">
      {children}
      <span className="transition-transform group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export { inputClass };

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={clsx(inputClass, props.className)} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={clsx(inputClass, "resize-y", props.className)} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={clsx(inputClass, "appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-9", props.className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b8b9b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} />;
}

const phaseStyles: Record<SessionPhase, { pill: string; dot: string }> = {
  upcoming: { pill: "bg-brand-50 text-brand-700", dot: "bg-brand-500" },
  in_progress: { pill: "bg-amber-100 text-amber-800", dot: "bg-amber-500 animate-pulse" },
  awaiting_results: { pill: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  completed: { pill: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  cancelled: { pill: "bg-subtle-2 text-muted line-through", dot: "bg-faint" },
};

export function PhaseBadge({ phase }: { phase: SessionPhase }) {
  const s = phaseStyles[phase];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", s.pill)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", s.dot)} />
      {phaseLabel[phase]}
    </span>
  );
}

export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
      {icon && <span className="text-faint">{icon}</span>}
      {children}
    </div>
  );
}

export function Stat({ label, value, unit, icon, tone = "default" }: { label: string; value: ReactNode; unit?: string; icon?: ReactNode; tone?: "default" | "brand" }) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl p-3.5 transition hover:-translate-y-0.5",
        tone === "brand" ? "bg-brand-gradient text-on-brand shadow-glow" : "border border-line bg-surface shadow-soft",
      )}
    >
      <div className={clsx("flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide", tone === "brand" ? "text-white/80" : "text-muted")}>
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">
        {value}
        {unit && <span className={clsx("ml-1 text-sm font-semibold", tone === "brand" ? "text-white/75" : "text-muted")}>{unit}</span>}
      </div>
    </div>
  );
}

const avatarGradients = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-violet-600",
];

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const hash = [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-bold text-white shadow-soft",
        avatarGradients[hash % avatarGradients.length],
        size === "sm" && "h-8 w-8 text-xs",
        size === "md" && "h-11 w-11 text-sm",
        size === "lg" && "h-14 w-14 text-lg",
      )}
    >
      {initials}
    </span>
  );
}

/** Сообщение-уведомление (успех/инфо/предупреждение) с анимацией появления. */
export function Notice({ tone = "success", children }: { tone?: "success" | "info" | "warning"; children: ReactNode }) {
  return (
    <div
      className={clsx(
        "mb-5 animate-rise rounded-2xl px-4 py-3 text-sm font-medium",
        tone === "success" && "bg-emerald-50 text-emerald-800",
        tone === "info" && "bg-brand-50 text-brand-800",
        tone === "warning" && "bg-amber-50 text-amber-900",
      )}
    >
      {children}
    </div>
  );
}
