import { requireClient } from "@/server/auth";
import { evaluateAchievements, listAchievements } from "@/server/services/achievements";
import { listRecords } from "@/server/services/records";
import { PageHeader } from "@/components/ui";
import { Badge } from "@/components/badges";
import { RecordsList } from "@/components/records-list";
import { plural } from "@/lib/time";

export const metadata = { title: "Мои достижения" };

export default async function AchievementsPage() {
  const { actor } = await requireClient();
  await evaluateAchievements(actor.clientId);
  const [badges, records] = await Promise.all([listAchievements(actor, actor.clientId), listRecords(actor, actor.clientId)]);
  const earned = badges.filter((b) => b.earnedAt).length;
  return (
    <>
      <PageHeader title="Мои достижения" subtitle={earned ? `Получено ${plural(earned, ["значок", "значка", "значков"])} из ${badges.length}` : "Значки появятся после тренировок"} />
      <div className="stagger grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
        {[...badges]
          .sort((a, b) => Number(!!b.earnedAt) - Number(!!a.earnedAt))
          .map((b, i) => (
            <Badge key={b.code} b={b} index={i} />
          ))}
      </div>
      <h2 className="mb-2.5 mt-10 px-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Мои рекорды</h2>
      <RecordsList records={records} />
    </>
  );
}
