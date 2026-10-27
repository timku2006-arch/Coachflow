import { BellOff, BellRing } from "lucide-react";

/** Включены ли у клиента push-уведомления (напоминания, «Придёте?», «Как самочувствие?»). */
export function PushStatus({ on }: { on: boolean }) {
  return on ? (
    <span className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-mint">
      <BellRing size={12} /> Уведомления включены
    </span>
  ) : (
    <span className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-coral">
      <BellOff size={12} /> Уведомления не включены
    </span>
  );
}
