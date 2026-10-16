import Link from "next/link";
import type { Actor } from "@/server/actor";
import { orNotFound } from "@/server/page-utils";
import { prisma } from "@/server/db";
import { getSession } from "@/server/services/sessions";
import { listExercises } from "@/server/services/exercises";
import { getActiveProgram } from "@/server/services/programs";
import { telegramLink } from "@/lib/booking-rules";
import { formatDate, formatDateTime, formatTime, moscowDateString, moscowTimeString, relativeDayLabel } from "@/lib/time";
import { canEnterResults } from "@/lib/session-phase";
import { Avatar, Card, Notice, PhaseBadge } from "./ui";
import { CalendarClock, Dumbbell } from "lucide-react";
import { ResultsList } from "./results-list";
import { SessionActions } from "./session-actions";
import { ResultsEditor, type EditorSet } from "./results-editor";
import { ActionForm, SubmitButton } from "./form";
import { inputClass } from "./input-class";
import { updateSessionNotesAction } from "@/app/actions/sessions";

/** Карточка записи: расписание и результаты в одной цепочке. */
export async function SessionDetail({ actor, sessionId, flash }: { actor: Actor; sessionId: string; flash?: string }) {
  const s = await orNotFound(getSession(actor, sessionId));
  const isTrainer = actor.role === "TRAINER";
  const base = isTrainer ? "/trainer" : "/client";
  const resultsAllowed = canEnterResults(s);

  let editor: React.ReactNode = null;
  if (isTrainer && resultsAllowed) {
    const exercises = await listExercises(actor);
    let initialSets: EditorSet[] = s.results.map((r) => ({ exerciseId: r.exerciseId, weightKg: String(r.weightKg), reps: String(r.reps) }));
    if (initialSets.length === 0) {
      // Заготовка из текущей программы клиента — тренеру остаётся поправить цифры.
      const program = await getActiveProgram(actor, s.clientId);
      initialSets = (program?.exercises ?? []).flatMap((pe) =>
        Array.from({ length: pe.sets }, () => ({
          exerciseId: pe.exerciseId,
          weightKg: pe.weightKg != null ? String(pe.weightKg) : "",
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
      />
    );
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({ where: { id: s.trainerId }, select: { telegramUsername: true } });

  return (
    <div className="stagger space-y-4">
      {/* Шапка занятия */}
      <div className="relative animate-rise overflow-hidden rounded-[2rem] border border-line bg-surface p-5 shadow-soft sm:p-6">
        <div aria-hidden className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {isTrainer && <Avatar name={s.client.user.name} size="lg" />}
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 first-letter:uppercase">{relativeDayLabel(s.startsAt)}</div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{isTrainer ? s.client.user.name : "Тренировка"}</h1>
            </div>
          </div>
          <PhaseBadge phase={s.phase} />
        </div>
        <div className="relative mt-5 flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Время (МСК)</div>
            <div className="text-3xl font-extrabold tracking-tight">
              {formatTime(s.startsAt)}
              <span className="text-muted">–{formatTime(s.endsAt)}</span>
            </div>
          </div>
          <div className="pb-1 text-sm font-medium text-ink-2 first-letter:uppercase">{formatDate(s.startsAt)}</div>
          {isTrainer && (
            <Link href={`/trainer/clients/${s.clientId}`} className="ml-auto pb-1 text-sm font-semibold text-brand-700 hover:underline">
              Карточка клиента →
            </Link>
          )}
        </div>
      </div>
      {flash && <Notice>{flash}</Notice>}

      {s.status === "SCHEDULED" && s.phase === "upcoming" && (
        <Card title="Управление записью" icon={<CalendarClock size={15} />}>
          <SessionActions
            sessionId={s.id}
            role={actor.role}
            canChange={isTrainer || s.clientCanChange}
            telegramUrl={telegramLink(trainerProfile?.telegramUsername)}
            defaultDate={moscowDateString(s.startsAt)}
            defaultTime={moscowTimeString(s.startsAt)}
          />
        </Card>
      )}

      {s.status === "CANCELLED" && (
        <Card>
          <p className="text-sm text-ink-2">Занятие отменено{s.cancelledAt ? ` ${formatDateTime(s.cancelledAt)}` : ""}.</p>
        </Card>
      )}

      {resultsAllowed && (
        <Card title="Результаты тренировки" icon={<Dumbbell size={15} />}>
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
        <Card title="Заметка к тренировке">
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

      <Link href={`${base}/schedule?week=${moscowDateString(s.startsAt)}`} className="inline-block text-sm text-muted hover:underline">
        ← К расписанию
      </Link>
    </div>
  );
}
