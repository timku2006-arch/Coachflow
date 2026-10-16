import clsx from "clsx";

const WAVE = "M10 38c6 0 7-14 13-14s7 16 13 16 7-18 13-18 5 8 5 8";

/** Знак: волна «flow» с переливом мята → сирень → коралл. */
export function Logo({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cf-wave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3ef2c5" />
          <stop offset="0.55" stopColor="#a99bff" />
          <stop offset="1" stopColor="#ff7a59" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="#131823" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="17.5" fill="none" stroke="#fff" strokeOpacity="0.08" />
      <path
        d={WAVE}
        fill="none"
        stroke="url(#cf-wave)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={animated ? 1 : undefined}
        className={animated ? "animate-[draw_1.4s_cubic-bezier(0.22,1,0.36,1)_both] [--len:1]" : undefined}
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-display font-semibold leading-none", className)}>
      <Logo className="h-[1.45em] w-[1.45em]" />
      <span>
        coach<span className="text-flow">flow</span>
      </span>
    </span>
  );
}

export { WAVE };
