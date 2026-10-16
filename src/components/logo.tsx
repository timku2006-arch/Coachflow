import clsx from "clsx";

/** Знак: разомкнутая дуга «C» с переливом трёх цветов колец и точкой на конце. */
export function Logo({ className, bg = true }: { className?: string; bg?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cf-arc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff2d55" />
          <stop offset="0.55" stopColor="#a3f93b" />
          <stop offset="1" stopColor="#1ee5ff" />
        </linearGradient>
      </defs>
      {bg && <rect width="64" height="64" rx="15" fill="#000" />}
      <path d="M44.5 17.5A19 19 0 1 0 44.5 46.5" fill="none" stroke="url(#cf-arc)" strokeWidth="8" strokeLinecap="round" />
      <circle cx="47" cy="32" r="4.5" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-display font-bold leading-none", className)}>
      <Logo className="h-[1.3em] w-[1.3em]" />
      CoachFlow
    </span>
  );
}
