export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0d9470" />
      <path d="M14 38c6 0 8-12 14-12s6 10 12 10 6-8 10-8" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="28" r="4" fill="#a7f3dc" />
    </svg>
  );
}
