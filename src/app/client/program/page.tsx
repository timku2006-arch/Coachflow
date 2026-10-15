import { requireClient } from "@/server/auth";
import { getActiveProgram } from "@/server/services/programs";
import { Card, Empty, PageHeader } from "@/components/ui";
import { ProgramView } from "@/components/program-view";
import { formatDate } from "@/lib/time";

export const metadata = { title: "Программа" };

export default async function ClientProgram() {
  const { actor } = await requireClient();
  const program = await getActiveProgram(actor, actor.clientId);
  return (
    <>
      <PageHeader title={program?.name ?? "Программа"} subtitle={program ? `Обновлена ${formatDate(program.updatedAt)}` : undefined} />
      <Card className="max-w-2xl">{program ? <ProgramView program={program} /> : <Empty>Тренер ещё не назначил программу</Empty>}</Card>
    </>
  );
}
