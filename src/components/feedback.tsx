import clsx from "clsx";
import { ActionForm, SubmitButton } from "./form";
import { saveFeedbackAction } from "@/app/actions/coaching";
import { MOODS, moodOf } from "@/lib/feedback";
import { relativeDayLabel } from "@/lib/time";

/** Три большие кнопки: 😊 Отлично / 😐 Нормально / 😣 Тяжело. Одно нажатие — ответ сохранён. */
export function MoodButtons({ sessionId, current, size = "lg" }: { sessionId: string; current?: number | null; size?: "lg" | "sm" }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {MOODS.map((m) => (
        <ActionForm key={m.value} action={saveFeedbackAction.bind(null, sessionId, m.value)} className="space-y-1">
          <SubmitButton
            variant="secondary"
            className={clsx(
              "w-full flex-col gap-1 !rounded-3xl",
              size === "lg" ? "h-28 text-[16px]" : "h-20 text-[14px]",
              current === m.value && "!bg-mint/15 !text-mint !ring-2 !ring-mint",
            )}
          >
            <span className={size === "lg" ? "text-[2.4rem] leading-none" : "text-[1.7rem] leading-none"}>{m.emoji}</span>
            {m.label}
          </SubmitButton>
        </ActionForm>
      ))}
    </div>
  );
}

/** Карточка на главной клиента: «Как самочувствие после тренировки?». */
export function FeedbackPrompt({ session }: { session: { id: string; startsAt: Date } }) {
  return (
    <section className="glass mb-5 animate-pop rounded-[2rem] p-5">
      <p className="mb-4 text-[19px] font-semibold leading-snug">
        Как самочувствие после тренировки
        <span className="text-mint"> {relativeDayLabel(session.startsAt).toLowerCase()}</span>?
      </p>
      <MoodButtons sessionId={session.id} />
    </section>
  );
}

/** Ответ клиента — для тренера и для истории. */
export function FeedbackView({ mood, note, compact = false }: { mood: number | null; note: string | null; compact?: boolean }) {
  const m = moodOf(mood);
  if (!m) return null;
  if (compact)
    return (
      <span className="text-[17px] leading-none" title={`Самочувствие: ${m.label}`}>
        {m.emoji}
      </span>
    );
  return (
    <div className="flex items-start gap-3">
      <span className="text-[2rem] leading-none">{m.emoji}</span>
      <div>
        <p className={clsx("text-[17px] font-semibold", m.value === 1 && "text-coral")}>{m.label}</p>
        {note && <p className="mt-0.5 whitespace-pre-line text-[15px] text-ink-2">«{note}»</p>}
      </div>
    </div>
  );
}
