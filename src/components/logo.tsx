export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cf-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9b80ff" />
          <stop offset="1" stopColor="#4f2fd6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#cf-g)" />
      <path d="M13 40c6 0 8-14 14.5-14S34 38 40.5 38 46 26 51 26" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="51" cy="26" r="4.5" fill="#c8f169" />
    </svg>
  );
}
