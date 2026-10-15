import { prisma } from "@/server/db";
import { requireTrainer } from "@/server/auth";
import { listAwaitingResults } from "@/server/services/sessions";
import { addMoscowDays, moscowWeekStart, toMoscow } from "@/lib/time";
import { startOfDay } from "date-fns";
import { Card, LinkButton, PageHeader, Stat } from "@/components/ui";
import { SessionList } from "@/components/session-list";

export const metadata = { title: "Главная" };

export default async function TrainerHome() {
  const { user, actor } = await requireTrainer();
  const now = new Date();
  const dayStart = new Date(startOfDay(toMoscow(now)).getTime());
  const weekStart = moscowWeekStart(now);
  const [today, awaiting, clientsCount, weekCount] = await Promise.all([
    prisma.session.findMany({
      where: { trainerId: actor.trainerId, startsAt: { gte: dayStart, lt: addMoscowDays(dayStart, 1) } },
      include: { client: { include: { user: { select: { name: true } } } } },
      orderBy: { startsAt: "asc" },
    }),
    listAwaitingResults(actor, now),
    prisma.clientProfile.count({ where: { trainerId: actor.trainerId } }),
    prisma.session.count({
      where: { trainerId: actor.trainerId, status: { not: "CANCELLED" }, startsAt: { gte: weekStart, lt: addMoscowDays(weekStart, 7) } },
    }),
  ]);
  return (
    <>
      <PageHeader title={`Привет, ${user.name.split(" ")[0]}!`} action={<LinkButton href="/trainer/schedule">+ Записать клиента</LinkButton>} />
      {!user.trainerProfile?.telegramUsername && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Укажите Telegram в <a href="/trainer/profile" className="font-medium underline">профиле</a> — клиенты смогут написать вам, если до занятия меньше 3 часов.
        </p>
      )}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="Клиентов" value={clientsCount} />
        <Stat label="Занятий на неделе" value={weekCount} />
        <Stat label="Ждут результатов" value={awaiting.length} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Сегодня">
          <SessionList sessions={today} href={(id) => `/trainer/sessions/${id}`} empty="Сегодня занятий нет" showClient />
        </Card>
        <Card title="Внесите результаты">
          <SessionList sessions={awaiting} href={(id) => `/trainer/sessions/${id}`} empty="Все результаты внесены 👍" showClient />
        </Card>
      </div>
    </>
  );
}
