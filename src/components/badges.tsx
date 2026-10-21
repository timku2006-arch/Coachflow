import clsx from "clsx";
import { Award, CalendarCheck, Flame, Handshake, Medal, Sparkles, Trophy } from "lucide-react";
import type { BadgeIcon } from "@/lib/achievements";
import type { BadgeView } from "@/server/services/achievements";
import { formatDate } from "@/lib/time";

const icons: Record<BadgeIcon, typeof Award> = { sparkles: Sparkles, flame: Flame, medal: Medal, trophy: Trophy, "calendar-check": CalendarCheck, award: Award, handshake: Handshake };
const colors = {
  mint: "from-mint to-[#8ff8dd] text-[#04201a]",
  coral: "from-coral to-[#ffb199] text-[#2b0d05]",
  lilac: "from-lilac to-[#d3cbff] text-[#140e33]",
};

/** Крупный значок: полученный — цветной, ещё не полученный — серый с прогрессом. */
export function Badge({ b, size = "lg", index = 0 }: { b: BadgeView; size?: "lg" | "sm"; index?: number }) {
  const Icon = icons[b.icon];
  const got = !!b.earnedAt;
  return (
    <div className="flex flex-col items-center text-center" style={{ animationDelay: `${index * 60}ms` }}>
      <div
        className={clsx(
          "flex items-center justify-center rounded-[38%] bg-gradient-to-br",
          size === "lg" ? "h-24 w-24" : "h-14 w-14",
          got ? `${colors[b.color]} shadow-glow` : "from-subtle to-subtle text-faint",
          got && "animate-pop",
        )}
      >
        <Icon size={size === "lg" ? 44 : 26} strokeWidth={2} />
      </div>
      <div className={clsx("mt-2 font-semibold leading-tight", size === "lg" ? "text-[16px]" : "text-[12px]", !got && "text-muted")}>{b.title}</div>
      {size === "lg" && (
        <div className="mt-0.5 text-[13px] text-muted">
          {got ? formatDate(b.earnedAt!) : b.progress ? `${b.progress.value} из ${b.progress.target}` : b.description}
        </div>
      )}
    </div>
  );
}
