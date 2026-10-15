import { requireTrainer } from "@/server/auth";
import { listExercises } from "@/server/services/exercises";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Empty, Input, PageHeader } from "@/components/ui";
import { createExerciseAction, deleteExerciseAction, renameExerciseAction } from "@/app/actions/trainer";

export const metadata = { title: "Упражнения" };

export default async function ExercisesPage() {
  const { actor } = await requireTrainer();
  const exercises = await listExercises(actor);
  return (
    <>
      <PageHeader title="Упражнения" subtitle="Справочник для программ и результатов" />
      <Card className="mb-4 max-w-2xl">
        <ActionForm action={createExerciseAction} resetOnSuccess className="flex flex-wrap items-start gap-2 space-y-0">
          <Input name="name" required maxLength={100} placeholder="Название, например «Жим ногами»" className="min-w-0 flex-1" />
          <SubmitButton>Добавить</SubmitButton>
        </ActionForm>
      </Card>
      <Card className="max-w-2xl">
        {exercises.length === 0 ? (
          <Empty>Справочник пуст</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {exercises.map((e) => {
              const used = e._count.programItems + e._count.results > 0;
              return (
                <li key={e.id} className="flex items-center gap-2 py-2">
                  <ActionForm action={renameExerciseAction.bind(null, e.id)} className="flex flex-1 items-center gap-2 space-y-0">
                    <input name="name" defaultValue={e.name} required maxLength={100} aria-label="Название" className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1.5 text-base hover:border-slate-200 focus:border-brand-500 focus:outline-none sm:text-sm" />
                    <SubmitButton variant="secondary" className="px-2 py-1 text-xs">OK</SubmitButton>
                  </ActionForm>
                  <span className="hidden text-xs text-slate-400 sm:inline">{e._count.results} подх.</span>
                  {!used && (
                    <ActionForm action={deleteExerciseAction.bind(null, e.id)} confirm={`Удалить «${e.name}»?`} className="space-y-0">
                      <button className="px-2 text-slate-400 hover:text-red-600" aria-label="Удалить">✕</button>
                    </ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
