import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { buttonClass } from "./button-class";
import { inputClass } from "./input-class";
import { phaseLabel, type SessionPhase } from "@/lib/session-phase";

export { inputClass };

/** Крупный заголовок экрана, как в приложениях iOS. */
export function PageHeader({ title, subtitle, action, eyebrow }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 inline-flex animate-rise items-center gap-2 rounded-full bg-surface px-3 py-1 text-[12px] font-semibold text-muted ring-1 ring-inset ring-white/5 first-letter:uppercase">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-mint" />
            {eyebrow}
          </div>
        )}
        <h1 className="animate-rise font-display text-[1.85rem] font-semibold leading-[1.1] [animation-delay:0.04s] sm:text-[2.4rem]">{title}</h1>
        {subtitle && <div className="mt-1.5 animate-rise text-[15px] text-muted [animation-delay:0.1s]">{subtitle}</div>}
      </div>
      {action && <div className="animate-rise [animation-delay:0.12s]">{action}</div>}
    </div>
  );
}

/** Карточка: тёмная плашка со скруглением, заголовок секции сверху. */
export function Card({
  title,
  action,
  children,
  className,
  icon,
  id,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  index?: string;
  id?: string;
}) {
  return (
    <section id={id} className={clsx("min-w-0 scroll-mt-24", className)}>
      {(title || action) && (
        <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
          {title && (
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
              {icon && <span className="text-mint">{icon}</span>}
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      <div className="glass rounded-3xl p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  return <Link {...props} className={clsx(buttonClass(variant), className)} />;
}

/** Ссылка «Показать все» в шапке секции */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="press inline-flex items-center gap-0.5 text-[14px] font-semibold text-mint hover:opacity-80">
      {children}
      <ChevronRight size={16} />
    </Link>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block px-1 text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={clsx(inputClass, props.className)} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={clsx(inputClass, "resize-y", props.className)} />;
}
export function Select(props: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={clsx(inputClass, "appearance-none bg-[length:14px] bg-[right_0.9rem_center] bg-no-repeat pr-9", props.className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 15 5 5 5-5M7 9l5-5 5 5'/%3E%3C/svg%3E\")",
      }}
    />
  );
}

const phaseStyles: Record<SessionPhase, { text: string; dot: string }> = {
  upcoming: { text: "text-lilac bg-lilac/12", dot: "bg-lilac" },
  in_progress: { text: "text-mint bg-mint/12", dot: "bg-mint animate-blink" },
  awaiting_results: { text: "text-coral bg-coral/12", dot: "bg-coral" },
  completed: { text: "text-mint bg-mint/12", dot: "bg-mint" },
  cancelled: { text: "text-muted bg-subtle line-through", dot: "bg-faint" },
  missed: { text: "text-coral bg-coral/12", dot: "bg-coral" },
};

export function PhaseBadge({ phase }: { phase: SessionPhase }) {
  const s = phaseStyles[phase];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold", s.text)}>
      <span className={clsx("h-2 w-2 rounded-full", s.dot)} />
      {phaseLabel[phase]}
    </span>
  );
}

export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-[15px] text-muted">
      {icon && <span className="text-faint">{icon}</span>}
      {children}
    </div>
  );
}

/** Показатель: подпись цветом, крупное округлое число. */
export function Stat({
  label,
  value,
  unit,
  tone = "default",
  color,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  tone?: "default" | "brand";
  color?: "red" | "green" | "blue";
}) {
  const c = color ?? (tone === "brand" ? "green" : undefined);
  const cls = c === "red" ? "text-coral" : c === "green" ? "text-mint" : c === "blue" ? "text-lilac" : "text-ink";
  const dot = c === "red" ? "bg-coral" : c === "green" ? "bg-mint" : c === "blue" ? "bg-lilac" : "bg-muted";
  return (
    <div className="glass rounded-3xl p-4">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
        <span className={clsx("h-2 w-2 rounded-full", dot)} />
        {label}
      </div>
      <div className={clsx("mt-2 font-display text-[1.9rem] font-semibold leading-none", cls)}>
        {value}
        {unit && <span className="ml-0.5 text-base font-semibold">{unit}</span>}
      </div>
    </div>
  );
}

const avatarTones = ["from-mint/90 to-lilac/90", "from-lilac/90 to-coral/90", "from-coral/90 to-mint/80"];

/** Монограмма в «капле» цветов бренда. */
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg"; accent?: boolean }) {
  const hash = [...name].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-[38%] bg-gradient-to-br font-display font-semibold leading-none text-[#0a0d14]",
        avatarTones[hash % avatarTones.length],
        size === "sm" && "h-8 w-8 text-[13px]",
        size === "md" && "h-11 w-11 text-base",
        size === "lg" && "h-16 w-16 text-2xl",
      )}
    >
      {initials}
    </span>
  );
}

/** Плашка-уведомление. */
export function Notice({ tone = "success", children }: { tone?: "success" | "info" | "warning"; children: ReactNode }) {
  return (
    <div
      className={clsx(
        "mb-5 animate-pop rounded-2xl px-4 py-3 text-[15px]",
        tone === "success" && "bg-mint/12 text-brand-300",
        tone === "info" && "bg-lilac/15 text-lilac",
        tone === "warning" && "bg-amber-50 text-amber-800",
      )}
    >
      {children}
    </div>
  );
}

/** Сгруппированный список в стиле iOS: строки с разделителями и шевроном. */
export function ListRow({ href, children, className }: { href?: string; children: ReactNode; className?: string }) {
  const inner = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      {href && <ChevronRight size={18} className="shrink-0 text-faint transition-transform duration-300 group-hover:translate-x-0.5" />}
    </>
  );
  const cls = clsx("group flex items-center gap-3 py-3 transition-colors", href && "press -mx-2 rounded-xl px-2 hover:bg-subtle/60", className);
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
