import { requireClient } from "@/server/auth";
import { listHistory } from "@/server/services/sessions";
import { plural } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { HistoryList } from "@/components/history-list";

export const metadata = { title: "История тренировок" };

export default async function ClientHistory() {
  const { actor } = await requireClient();
  const history = await listHistory(actor, actor.clientId);
  return (
    <>
      <PageHeader title="История тренировок" subtitle={plural(history.length, ["тренировка", "тренировки", "тренировок"])} />
      <div className="max-w-2xl">
        <HistoryList history={history} hrefBase="/client/sessions" />
      </div>
    </>
  );
}
