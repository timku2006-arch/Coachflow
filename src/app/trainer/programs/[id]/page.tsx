import Link from "next/link";
import { orNotFound } from "@/server/page-utils";
import { requireTrainer } from "@/server/auth";
import { prisma } from "@/server/db";
import { getProgram } from "@/server/services/programs";
import { listExercises } from "@/server/services/exercises";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Notice, PageHeader } from "@/components/ui";
import { ProgramEditor } from "@/components/program-editor";
import { activateProgramAction, deleteProgramAction, updateProgramAction } from "@/app/actions/trainer";

export const metadata = { title: "Программа" };

export default async function ProgramPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { actor } = await requireTrainer();
  const { id } = await params;
  const { saved } = await searchParams;
  const program = await orNotFound(getProgram(actor, id));
  const [exercises, client] = await Promise.all([
    listExercises(actor),
    prisma.clientProfile.findUnique({ where: { id: program.clientId }, include: { user: { select: { name: true } } } }),
  ]);
  return (
    <>
      <PageHeader
        title={program.name}
        subtitle={
          <Link href={`/trainer/clients/${program.clientId}?tab=programs`} className="hover:underline">
            ← {client?.user.name}
          </Link>
        }
        action={
          program.isActive ? (
            <span className="rounded-full bg-brand-500/15 px-3 py-1.5 text-[14px] font-semibold text-brand-500">Текущая программа</span>
          ) : (
            <ActionForm action={activateProgramAction.bind(null, id)}>
              <SubmitButton variant="secondary">Сделать текущей</SubmitButton>
            </ActionForm>
          )
        }
      />
      {saved && <Notice>Программа создана</Notice>}
      <Card className="max-w-2xl">
        <ProgramEditor
          action={updateProgramAction.bind(null, id)}
          exercises={exercises.map((e) => ({ id: e.id, name: e.name }))}
          initial={{
            name: program.name,
            description: program.description ?? "",
            items: program.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              dayLabel: e.dayLabel ?? "",
              sets: String(e.sets),
              reps: e.reps,
              weightKg: e.weightKg != null ? String(e.weightKg) : "",
              notes: e.notes ?? "",
            })),
          }}
          submitLabel="Сохранить"
        />
      </Card>
      <ActionForm action={deleteProgramAction.bind(null, id)} confirm="Удалить программу безвозвратно?" className="mt-4">
        <SubmitButton variant="danger">Удалить программу</SubmitButton>
      </ActionForm>
    </>
  );
}
