import Link from "next/link";
import type { Actor } from "@/server/actor";
import { orNotFound } from "@/server/page-utils";
import { prisma } from "@/server/db";
import { getSession } from "@/server/services/sessions";
import { listExercises } from "@/server/services/exercises";
import { getActiveProgram } from "@/server/services/programs";
import { telegramLink } from "@/lib/booking-rules";
import { formatDateTime, formatDayMonth, formatLongDate, formatTime, moscowDateString, moscowTimeString, relativeDayLabel } from "@/lib/time";
import { attendanceOf, canEnterResults } from "@/lib/session-phase";
import { Avatar, Card, Notice, PhaseBadge } from "./ui";
import { Countdown } from "./countdown";
import { FlowWaves } from "./flow-waves";
import { ResultsList, groupResults } from "./results-list";
import { SessionActions } from "./session-actions";
import { ResultsEditor, type EditorSet } from "./results-editor";
import { ActionForm, SubmitButton } from "./form";
import { inputClass } from "./input-class";
import { updateSessionNotesAction } from "@/app/actions/sessions";
import { resultsDraftSchema } from "@/lib/validation";
import { markMissedAction } from "@/app/actions/coaching";
import { AttendanceBadge, AttendancePrompt } from "./attendance";
import { RecordBanner } from "./record-banner";

/** «Сегодня, 27 октября» для ближайших дней, иначе «вторник, 20 октября». */
function dayHeading(d: Date) {
  const rel = relativeDayLabel(d);
  return ["Сегодня", "Завтра", "Вчера"].includes(rel) ? `${rel}, ${formatDayMonth(d)}` : formatLongDate(d);
}

/** Карточка записи: расписание и результаты в одной цепочке. */
export async function SessionDetail({ actor, sessionId, flash }: { actor: Actor; sessionId: string; flash?: string }) {
  const s = await orNotFound(getSession(actor, sessionId));
  const isTrainer = actor.role === "TRAINER";
  const base = isTrainer ? "/trainer" : "/client";
  // Тренер открывает карточку за 15 минут до начала и может исправить неявку, внеся результаты.
  // Клиент видит результаты только после начала и не при неявке.
  const resultsAllowed = canEnterResults(s) && (isTrainer || (s.phase !== "upcoming" && s.status !== "MISSED"));

  let editor: React.ReactNode = null;
  if (isTrainer && resultsAllowed) {
    const exercises = await listExercises(actor);
    // подходы одного упражнения — подряд, как их вводил тренер
    let initialSets: EditorSet[] = groupResults(s.results).flatMap((g) =>
      g.sets.map((r) => ({ exerciseId: r.exercise.id, weightKg: String(r.weightKg).replace(".", ","), reps: String(r.reps) })),
    );
    if (initialSets.length === 0) {
      // Заготовка из текущей программы клиента — тренеру остаётся поправить цифры.
      const program = await getActiveProgram(actor, s.clientId);
      initialSets = (program?.exercises ?? []).flatMap((pe) =>
        Array.from({ length: pe.sets }, () => ({
          exerciseId: pe.exerciseId,
          weightKg: pe.weightKg != null ? String(pe.weightKg).replace(".", ",") : "",
          reps: String(parseInt(pe.reps, 10) || ""),
        })),
      );
    }
    editor = (
      <ResultsEditor
        sessionId={s.id}
        exercises={exercises.map((e) => ({ id: e.id, name: e.name }))}
        initialSets={initialSets}
        initialNotes={s.notes ?? ""}
        completed={s.status === "COMPLETED"}
        draft={s.status === "SCHEDULED" ? (resultsDraftSchema.safeParse(s.resultsDraft).data ?? null) : null}
      />
    );
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({ where: { id: s.trainerId }, select: { telegramUsername: true } });
  const records =
    s.status === "COMPLETED"
      ? await prisma.personalRecord.findMany({ where: { sessionId: s.id }, include: { exercise: { select: { name: true } } }, orderBy: { weightKg: "desc" } })
      : [];

  return (
    <div className="stagger space-y-4">
      {/* Шапка занятия */}
      <div className="glass relative animate-pop overflow-hidden rounded-[2rem] p-5">
        <FlowWaves className="absolute inset-x-0 -bottom-6 h-20 opacity-[0.14]" />
        <div className="relative flex items-center gap-3">
          {isTrainer && <Avatar name={s.client.user.name} size="lg" />}
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-muted first-letter:uppercase">
              {dayHeading(s.startsAt)}
            </div>
            <h1 className="line-clamp-2 break-words font-display text-[1.6rem] font-semibold leading-tight">{isTrainer ? s.client.user.name : "Тренировка"}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <PhaseBadge phase={s.phase} />
              {isTrainer && <AttendanceBadge value={attendanceOf(s)} />}
            </div>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-white/[0.06] pt-3">
          <div className="whitespace-nowrap font-display text-[2.3rem] font-semibold leading-none sm:text-5xl">
            {formatTime(s.startsAt)}
            <span className="text-faint">–{formatTime(s.endsAt)}</span>
          </div>
          {s.phase === "upcoming" ? (
            <div className="text-right">
              <div className="text-[13px] font-semibold text-muted">До начала</div>
              <Countdown to={s.startsAt.toISOString()} className="font-display text-2xl font-semibold leading-none text-flow" />
            </div>
          ) : (
            isTrainer && (
              <Link href={`/trainer/clients/${s.clientId}`} className="press text-[15px] font-semibold text-mint">
                Карточка клиента →
              </Link>
            )
          )}
        </div>
      </div>
      {flash && <Notice>{flash}</Notice>}
      {records[0] && <RecordBanner record={records[0]} more={records.length - 1} moreSuffix=" в этой тренировке" />}
      {!isTrainer && s.status === "SCHEDULED" && s.phase === "upcoming" && !s.confirmedAt && <AttendancePrompt session={s} />}

      {s.status === "SCHEDULED" && s.phase === "upcoming" && (
        <Card title="Запись">
          <SessionActions
            sessionId={s.id}
            role={actor.role}
            canChange={isTrainer || s.clientCanChange}
            telegramUrl={telegramLink(trainerProfile?.telegramUsername)}
            defaultDate={moscowDateString(s.startsAt)}
            defaultTime={moscowTimeString(s.startsAt)}
            defaultDuration={Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60_000)}
          />
        </Card>
      )}

      {s.status === "CANCELLED" && (
        <Card>
          <p className="text-sm text-ink-2">Занятие отменено{s.cancelledAt ? ` ${formatDateTime(s.cancelledAt)}` : ""}.</p>
        </Card>
      )}

      {isTrainer && s.status === "SCHEDULED" && s.phase === "awaiting_results" && (
        <ActionForm action={markMissedAction.bind(null, s.id)} confirm="Отметить, что клиент не пришёл?">
          <SubmitButton variant="ghost" className="w-full">
            Клиент не пришёл
          </SubmitButton>
        </ActionForm>
      )}

      {s.status === "MISSED" && (
        <Card>
          <p className="text-sm text-ink-2">Клиент не пришёл на занятие.</p>
        </Card>
      )}

      {resultsAllowed && (
        <Card title={isTrainer && s.status === "SCHEDULED" ? "Ведём тренировку" : "Результаты"}>
          {isTrainer ? (
            editor
          ) : (
            <>
              <ResultsList results={s.results} />
              {s.status !== "COMPLETED" && <p className="mt-2 text-xs text-muted">Тренер внесёт результаты после занятия.</p>}
            </>
          )}
        </Card>
      )}

      {/* Заметка: клиент видит итоговую, тренер может написать план до занятия */}
      {!resultsAllowed && isTrainer && s.status !== "CANCELLED" && (
        <Card title="Заметка">
          <ActionForm action={updateSessionNotesAction.bind(null, s.id)}>
            <textarea name="notes" defaultValue={s.notes ?? ""} rows={3} maxLength={2000} placeholder="План, акценты, на что обратить внимание" className={inputClass} />
            <SubmitButton variant="secondary">Сохранить заметку</SubmitButton>
          </ActionForm>
        </Card>
      )}
      {!isTrainer && s.notes && (
        <Card title="Заметка тренера">
          <p className="whitespace-pre-line text-sm text-ink-2">{s.notes}</p>
        </Card>
      )}

      <Link href={`${base}/schedule?week=${moscowDateString(s.startsAt)}`} className="press inline-block text-[15px] font-medium text-mint">
        ← К расписанию
      </Link>
    </div>
  );
}
