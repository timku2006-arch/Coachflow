import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

/** Кнопки в духе iOS: скруглённые, с мягким «утапливанием» при нажатии. */
export function buttonClass(variant: ButtonVariant = "primary") {
  return clsx(
    "press inline-flex select-none items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[15px] font-semibold leading-none",
    "disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
    variant === "primary" && "bg-brand-500 text-on-brand hover:bg-brand-400",
    variant === "secondary" && "bg-subtle text-ink hover:bg-subtle-2",
    variant === "danger" && "bg-red-600/15 text-red-600 hover:bg-red-600/25",
    variant === "ghost" && "px-3 text-brand-500 hover:bg-subtle",
  );
}
