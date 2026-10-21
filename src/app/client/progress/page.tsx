import { requireClient } from "@/server/auth";
import { PageHeader } from "@/components/ui";
import { ProgressTabs, type ProgressTab } from "@/components/progress-section";

export const metadata = { title: "Прогресс" };

export default async function ClientProgress({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { actor } = await requireClient();
  const { tab } = await searchParams;
  const t: ProgressTab = tab === "exercises" || tab === "photos" ? tab : "body";
  return (
    <>
      <PageHeader title="Прогресс" />
      <ProgressTabs actor={actor} clientId={actor.clientId} tab={t} hrefFor={(k) => `/client/progress?tab=${k}`} />
    </>
  );
}
