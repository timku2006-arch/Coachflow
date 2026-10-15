import { requireClient } from "@/server/auth";
import { PageHeader } from "@/components/ui";
import { ProgressSection } from "@/components/progress-section";

export const metadata = { title: "Прогресс" };

export default async function ClientProgress() {
  const { actor } = await requireClient();
  return (
    <>
      <PageHeader title="Прогресс" />
      <ProgressSection actor={actor} clientId={actor.clientId} />
    </>
  );
}
