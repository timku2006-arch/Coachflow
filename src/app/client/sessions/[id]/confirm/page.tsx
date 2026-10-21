import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { requireClient } from "@/server/auth";
import { orNotFound } from "@/server/page-utils";
import { getSession } from "@/server/services/sessions";
import { prisma } from "@/server/db";
import { clientCanChangeSession, telegramLink } from "@/lib/booking-rules";
import { formatDate, formatTime, relativeDayLabel } from "@/lib/time";
import { ActionForm, SubmitButton } from "@/components/form";
import { buttonClass } from "@/components/button-class";
import { LockedNotice } from "@/components/session-actions";
import { cancelSessionAction } from "@/app/actions/sessions";
import { confirmAttendanceAction } from "@/app/actions/coaching";

export const metadata = { title: "Придёте?" };

/**
 * Ответ на напоминание. Одно действие на экран:
 * «Приду» — подтверждаем; «Не смогу» — отмена по правилу 3 часов или Telegram тренера.
 */
export default async function ConfirmPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ answer?: string }> }) {
  const { actor } = await requireClient();
  const { id } = await params;
  const { answer } = await searchParams;
  const s = await orNotFound(getSession(actor, id));
  const now = new Date();
  const when = (
    <span className="text-mint">
      {relativeDayLabel(s.startsAt).toLowerCase()} в {formatTime(s.startsAt)}
    </span>
  );
  const big = "h-16 w-full text-lg";

  let body: React.ReactNode;
  if (s.status === "CANCELLED") {
    body = <Result icon="x" title="Тренировка отменена" text="Если захотите прийти — запишитесь заново." />;
  } else if (s.status !== "SCHEDULED" || s.startsAt <= now) {
    body = <Result icon="ok" title="Тренировка уже прошла" text="Результаты появятся в истории." />;
  } else if (answer === "decline") {
    if (clientCanChangeSession(s.startsAt, now)) {
      body = (
        <>
          <h1 className="font-display text-[1.9rem] font-semibold leading-tight">Отменить тренировку {when}?</h1>
          <div className="mt-8 space-y-3">
            <ActionForm action={cancelSessionAction.bind(null, s.id)}>
              <SubmitButton variant="danger" className={big}>
                Да, отменить
              </SubmitButton>
            </ActionForm>
            <Link href={`/client/sessions/${s.id}/confirm`} className={buttonClass("secondary") + " " + big}>
              Нет, я приду
            </Link>
          </div>
        </>
      );
    } else {
      const trainer = await prisma.trainerProfile.findUnique({ where: { id: s.trainerId }, select: { telegramUsername: true } });
      body = (
        <>
          <h1 className="mb-6 font-display text-[1.9rem] font-semibold leading-tight">Не получается прийти {when}?</h1>
          <LockedNotice telegramUrl={telegramLink(trainer?.telegramUsername)} />
        </>
      );
    }
  } else if (s.confirmedAt) {
    body = <Result icon="ok" title="Ждём вас!" text={`${formatDate(s.startsAt)}, ${formatTime(s.startsAt)}`} />;
  } else {
    body = (
      <>
        <h1 className="font-display text-[1.9rem] font-semibold leading-tight">Придёте на тренировку {when}?</h1>
        <div className="mt-8 space-y-3">
          <ActionForm action={confirmAttendanceAction.bind(null, s.id)}>
            <SubmitButton className={big}>Приду</SubmitButton>
          </ActionForm>
          <Link href={`/client/sessions/${s.id}/confirm?answer=decline`} className={buttonClass("secondary") + " " + big}>
            Не смогу
          </Link>
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

function Result({ icon, title, text }: { icon: "ok" | "x"; title: string; text: string }) {
  const Icon = icon === "ok" ? CheckCircle2 : XCircle;
  return (
    <div className="py-4 text-center">
      <Icon size={72} className={`mx-auto animate-pop ${icon === "ok" ? "text-mint" : "text-coral"}`} />
      <h1 className="mt-4 font-display text-[1.9rem] font-semibold">{title}</h1>
      <p className="mt-1 text-[17px] text-ink-2">{text}</p>
    </div>
  );
}
