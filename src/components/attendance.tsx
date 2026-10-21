import Link from "next/link";
import { CalendarCheck2, CheckCircle2 } from "lucide-react";
import { ActionForm, SubmitButton } from "./form";
import { buttonClass } from "./button-class";
import { confirmAttendanceAction } from "@/app/actions/coaching";
import { formatTime, relativeDayLabel } from "@/lib/time";
import { attendanceLabel, type Attendance } from "@/lib/session-phase";

/** Большая карточка на главной клиента: «Придёте?» — две крупные кнопки и ничего лишнего. */
export function AttendancePrompt({ session }: { session: { id: string; startsAt: Date } }) {
  return (
    <section className="glass mb-5 animate-pop rounded-[2rem] p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lilac/15 text-lilac">
          <CalendarCheck2 size={26} />
        </span>
        <div className="text-[19px] font-semibold leading-snug">
          Придёте на тренировку
          <br />
          <span className="text-mint first-letter:lowercase">
            {relativeDayLabel(session.startsAt).toLowerCase()} в {formatTime(session.startsAt)}?
          </span>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <ActionForm action={confirmAttendanceAction.bind(null, session.id)} className="space-y-2">
          <SubmitButton className="h-16 w-full text-lg">Приду</SubmitButton>
        </ActionForm>
        <Link href={`/client/sessions/${session.id}/confirm?answer=decline`} className={buttonClass("secondary") + " h-16 w-full text-lg"}>
          Не смогу
        </Link>
      </div>
    </section>
  );
}

const tone: Record<Exclude<Attendance, null>, string> = {
  confirmed: "text-mint",
  pending: "text-muted",
  cancelled: "text-coral line-through",
};

/** Метка статуса записи для тренера. */
export function AttendanceBadge({ value, compact = false }: { value: Attendance; compact?: boolean }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${tone[value]}`} title={attendanceLabel[value]}>
      {value === "confirmed" ? <CheckCircle2 size={13} /> : value === "pending" ? <span className="text-[13px] leading-none">?</span> : null}
      {!compact && attendanceLabel[value]}
    </span>
  );
}
