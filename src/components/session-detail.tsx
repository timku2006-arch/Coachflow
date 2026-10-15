import Link from "next/link";
import type { Actor } from "@/server/actor";
import { orNotFound } from "@/server/page-utils";
import { prisma } from "@/server/db";
import { getSession } from "@/server/services/sessions";
import { listExercises } from "@/server/services/exercises";
import { getActiveProgram } from "@/server/services/programs";
import { telegramLink } from "@/lib/booking-rules";
import { formatDateTime, formatTime, moscowDateString, moscowTimeString } from "@/lib/time";
import { canEnterResults } from "@/lib/session-phase";
import { Card, PageHeader, PhaseBadge } from "./ui";
import { ResultsList } from "./results-list";
import { SessionActions } from "./session-actions";
import { ResultsEditor, type EditorSet } from "./results-editor";
import { ActionForm, SubmitButton } from "./form";
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
    <div className="space-y-4">
      <PageHeader
        title={isTrainer ? s.client.user.name : "Занятие"}
        subtitle={
          <>
            {formatDateTime(s.startsAt)}–{formatTime(s.endsAt)} (МСК) · <PhaseBadge phase={s.phase} />
          </>
        }
        action={
          isTrainer ? (
            <Link href={`/trainer/clients/${s.clientId}`} className="text-sm text-brand-700 hover:underline">
              Карточка клиента →
            </Link>
          ) : undefined
        }
      />
      {flash && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash}</p>}

      {s.status === "SCHEDULED" && s.phase === "upcoming" && (
        <Card title="Запись">
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
          <p className="text-sm text-slate-600">Занятие отменено{s.cancelledAt ? ` ${formatDateTime(s.cancelledAt)}` : ""}.</p>
        </Card>
      )}

      {resultsAllowed && (
        <Card title="Результаты тренировки">
          {isTrainer ? (
            editor
          ) : (
            <>
              <ResultsList results={s.results} />
              {s.status !== "COMPLETED" && <p className="mt-2 text-xs text-slate-500">Тренер внесёт результаты после занятия.</p>}
            </>
          )}
        </Card>
      )}

      {/* Заметка: клиент видит итоговую, тренер может написать план до занятия */}
      {!resultsAllowed && isTrainer && s.status !== "CANCELLED" && (
        <Card title="Заметка к тренировке">
          <ActionForm action={updateSessionNotesAction.bind(null, s.id)}>
            <textarea name="notes" defaultValue={s.notes ?? ""} rows={3} maxLength={2000} placeholder="План, акценты, на что обратить внимание" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm" />
            <SubmitButton variant="secondary">Сохранить заметку</SubmitButton>
          </ActionForm>
        </Card>
      )}
      {!isTrainer && s.notes && (
        <Card title="Заметка тренера">
          <p className="whitespace-pre-line text-sm text-slate-700">{s.notes}</p>
        </Card>
      )}

      <Link href={`${base}/schedule?week=${moscowDateString(s.startsAt)}`} className="inline-block text-sm text-slate-500 hover:underline">
        ← К расписанию
      </Link>
    </div>
  );
}
