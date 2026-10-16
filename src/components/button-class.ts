import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

/** Кнопки-«пилюли»: основная — мятная с мягким свечением. */
export function buttonClass(variant: ButtonVariant = "primary") {
  return clsx(
    "press inline-flex select-none items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold leading-none",
    "disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint",
    variant === "primary" && "bg-gradient-to-r from-mint to-[#7af7d8] text-on-brand shadow-glow hover:brightness-110",
    variant === "secondary" && "bg-subtle text-ink ring-1 ring-inset ring-white/5 hover:bg-subtle-2",
    variant === "danger" && "bg-coral/15 text-coral hover:bg-coral/25",
    variant === "ghost" && "px-3 text-mint hover:bg-subtle",
  );
}
