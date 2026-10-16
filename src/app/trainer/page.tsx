import Link from "next/link";
import { startOfDay } from "date-fns";
import { CalendarDays, ClipboardCheck, Plus, Send } from "lucide-react";
import { prisma } from "@/server/db";
import { requireTrainer } from "@/server/auth";
import { listAwaitingResults } from "@/server/services/sessions";
import { addMoscowDays, formatLongDate, moscowWeekStart, toMoscow } from "@/lib/time";
import { Card, LinkButton, Notice, PageHeader, Stat } from "@/components/ui";
import { SessionList } from "@/components/session-list";
import { CountUp } from "@/components/count-up";

export const metadata = { title: "Главная" };

function greeting(now: Date) {
  const h = toMoscow(now).getHours();
  return h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
}

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
  const activeToday = today.filter((s) => s.status !== "CANCELLED");
  return (
    <>
      <PageHeader
        eyebrow={<span className="first-letter:uppercase">{formatLongDate(now)}</span>}
        title={`${greeting(now)}, ${user.name.split(" ")[0]}!`}
        subtitle={activeToday.length ? `Сегодня ${activeToday.length === 1 ? "одна тренировка" : `тренировок: ${activeToday.length}`}` : "Сегодня тренировок нет — можно выдохнуть"}
        action={
          <LinkButton href="/trainer/schedule">
            <Plus size={18} strokeWidth={2.5} /> Записать клиента
          </LinkButton>
        }
      />
      {!user.trainerProfile?.telegramUsername && (
        <Notice tone="warning">
          <Send size={15} className="mr-1.5 inline -translate-y-px" />
          Укажите Telegram в{" "}
          <Link href="/trainer/profile" className="font-bold underline">
            профиле
          </Link>{" "}
          — клиенты смогут написать вам, если до занятия меньше 3 часов.
        </Notice>
      )}
      <div className="stagger mb-5 grid grid-cols-3 gap-2.5">
        <Stat tone="brand" label="Клиенты" value={<CountUp value={clientsCount} />} />
        <Stat label="За неделю" value={<CountUp value={weekCount} />} />
        <Stat label="Без итогов" value={<CountUp value={awaiting.length} />} />
      </div>
      <div className="stagger grid gap-4 md:grid-cols-2">
        <Card title="Сегодня" icon={<CalendarDays size={15} />}>
          <SessionList sessions={today} href={(id) => `/trainer/sessions/${id}`} empty="Сегодня занятий нет" showClient />
        </Card>
        <Card title="Внесите результаты" icon={<ClipboardCheck size={15} />}>
          <SessionList sessions={awaiting} href={(id) => `/trainer/sessions/${id}`} empty="Все результаты внесены — отличная работа!" showClient />
        </Card>
      </div>
    </>
  );
}
