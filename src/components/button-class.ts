import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function buttonClass(variant: ButtonVariant = "primary") {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-60",
    variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700",
    variant === "secondary" && "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
    variant === "ghost" && "text-brand-700 hover:bg-brand-50",
  );
}
