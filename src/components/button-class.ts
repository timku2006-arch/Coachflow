import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function buttonClass(variant: ButtonVariant = "primary") {
  return clsx(
    "inline-flex select-none items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold",
    "transition-all duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200",
    variant === "primary" && "bg-brand-gradient text-on-brand shadow-glow hover:-translate-y-0.5 hover:brightness-110",
    variant === "secondary" && "border border-line-strong bg-surface text-ink hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft",
    variant === "danger" && "bg-red-600 text-white shadow-[0_10px_30px_-12px_rgb(220_38_38_/_0.7)] hover:-translate-y-0.5 hover:bg-red-500",
    variant === "ghost" && "text-brand-700 hover:bg-brand-50",
  );
}
