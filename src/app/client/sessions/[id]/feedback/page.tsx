import Link from "next/link";
import { requireClient } from "@/server/auth";
import { orNotFound } from "@/server/page-utils";
import { getSession } from "@/server/services/sessions";
import { ActionForm, SubmitButton } from "@/components/form";
import { Textarea } from "@/components/ui";
import { MoodButtons } from "@/components/feedback";
import { saveFeedbackNoteAction } from "@/app/actions/coaching";
import { moodOf } from "@/lib/feedback";
import { relativeDayLabel } from "@/lib/time";

export const metadata = { title: "Самочувствие" };

/**
 * «Как самочувствие после тренировки?» Шаг 1 — одно нажатие (три большие кнопки).
 * Шаг 2 — «Спасибо!» и по желанию пара слов тренеру.
 */
export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor } = await requireClient();
  const { id } = await params;
  const s = await orNotFound(getSession(actor, id));
  const mood = moodOf(s.feedbackMood);
  const day = relativeDayLabel(s.startsAt).toLowerCase();

  let body: React.ReactNode;
  if (s.status !== "COMPLETED") {
    body = <p className="py-4 text-center text-[17px] text-ink-2">Спросим о самочувствии после тренировки.</p>;
  } else if (!mood) {
    body = (
      <>
        <h1 className="mb-6 font-display text-[1.9rem] font-semibold leading-tight">
          Как самочувствие после тренировки <span className="text-mint">{day}</span>?
        </h1>
        <MoodButtons sessionId={s.id} />
      </>
    );
  } else {
    body = (
      <>
        <div className="text-center">
          <div className="animate-pop text-[4.5rem] leading-none">{mood.emoji}</div>
          <h1 className="mt-3 font-display text-[1.9rem] font-semibold">Спасибо!</h1>
          <p className="mt-1 text-[17px] text-ink-2">{mood.value === 1 ? "Тренер узнает и учтёт на следующей тренировке." : "Тренер увидит ваш ответ."}</p>
        </div>
        <ActionForm action={saveFeedbackNoteAction.bind(null, s.id)} className="mt-6">
          <label className="block">
            <span className="mb-2 block text-[17px] font-semibold">Хотите что-то сказать тренеру?</span>
            <Textarea name="note" defaultValue={s.feedbackNote ?? ""} maxLength={500} placeholder="Например: немного болит колено" className="text-[17px]" />
          </label>
          <SubmitButton variant="secondary" className="h-14 w-full text-[17px]">
            Отправить
          </SubmitButton>
        </ActionForm>
        <div className="mt-6">
          <p className="mb-2 text-[14px] text-muted">Передумали? Выберите другой ответ:</p>
          <MoodButtons sessionId={s.id} current={mood.value} size="sm" />
        </div>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-md pt-4">
      <div className="glass animate-pop rounded-[2rem] p-6">{body}</div>
      <Link href="/client" className="press mt-6 block text-center text-[17px] font-semibold text-mint">
        На главную
      </Link>
    </div>
  );
}
