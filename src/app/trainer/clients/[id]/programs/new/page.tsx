import { orNotFound } from "@/server/page-utils";
import { requireTrainer } from "@/server/auth";
import { getClient } from "@/server/services/clients";
import { listExercises } from "@/server/services/exercises";
import { Card, PageHeader } from "@/components/ui";
import { ProgramEditor } from "@/components/program-editor";
import { createProgramAction } from "@/app/actions/trainer";

export const metadata = { title: "Новая программа" };

export default async function NewProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor } = await requireTrainer();
  const { id } = await params;
  const client = await orNotFound(getClient(actor, id));
  const exercises = await listExercises(actor);
  return (
    <>
      <PageHeader title="Новая программа" subtitle={client.user.name} />
      <Card className="max-w-2xl">
        <ProgramEditor
          action={createProgramAction.bind(null, id)}
          exercises={exercises.map((e) => ({ id: e.id, name: e.name }))}
          initial={{ name: "", description: "", items: [] }}
          submitLabel="Создать программу"
        />
      </Card>
    </>
  );
}
