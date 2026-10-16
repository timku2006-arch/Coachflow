import Link from "next/link";
import { startOfDay } from "date-fns";
import { Plus } from "lucide-react";
import { prisma } from "@/server/db";
import { requireTrainer } from "@/server/auth";
import { listAwaitingResults } from "@/server/services/sessions";
import { vapidPublicKey } from "@/server/services/notifications";
import { addMoscowDays, formatLongDate, moscowWeekStart, toMoscow } from "@/lib/time";
import { Card, LinkButton, Notice, PageHeader, Stat } from "@/components/ui";
import { SessionList } from "@/components/session-list";
import { Digits } from "@/components/digits";
import { PushPrompt } from "@/components/push-setup";
import { Welcome } from "@/components/welcome";
import { RingLegend, Rings } from "@/components/rings";

export const metadata = { title: "Сводка" };

function greeting(now: Date) {
  const h = toMoscow(now).getHours();
  return h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
}

export default async function TrainerHome({ searchParams }: { searchParams: Promise<{ hello?: string }> }) {
  const { user, actor } = await requireTrainer();
  const { hello } = await searchParams;
  const now = new Date();
  const dayStart = new Date(startOfDay(toMoscow(now)).getTime());
  const weekStart = moscowWeekStart(now);
  const weekWhere = { trainerId: actor.trainerId, status: { not: "CANCELLED" as const }, startsAt: { gte: weekStart, lt: addMoscowDays(weekStart, 7) } };
  const [today, awaiting, clientsCount, weekTotal, weekDone, weekPast, publicKey] = await Promise.all([
    prisma.session.findMany({
      where: { trainerId: actor.trainerId, startsAt: { gte: dayStart, lt: addMoscowDays(dayStart, 1) } },
      include: { client: { include: { user: { select: { name: true } } } } },
      orderBy: { startsAt: "asc" },
    }),
    listAwaitingResults(actor, now),
    prisma.clientProfile.count({ where: { trainerId: actor.trainerId } }),
    prisma.session.count({ where: weekWhere }),
    prisma.session.count({ where: { ...weekWhere, status: "COMPLETED" } }),
    prisma.session.count({ where: { ...weekWhere, startsAt: { gte: weekStart, lte: now } } }),
    vapidPublicKey(),
  ]);
  const todayActive = today.filter((s) => s.status !== "CANCELLED");
  const todayDone = todayActive.filter((s) => s.status === "COMPLETED").length;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <Welcome show={hello === "1"} name={firstName} line={formatLongDate(now)} />
      <PageHeader
        eyebrow={formatLongDate(now)}
        title="Сводка"
        subtitle={`${greeting(now)}, ${firstName}`}
        action={
          <LinkButton href="/trainer/schedule">
            <Plus size={18} strokeWidth={2.5} /> Записать
          </LinkButton>
        }
      />
      {!user.trainerProfile?.telegramUsername && (
        <Notice tone="warning">
          Укажите Telegram в{" "}
          <Link href="/trainer/profile" className="font-semibold underline">
            профиле
          </Link>{" "}
          — клиенты смогут написать вам, если до занятия меньше 3 часов.
        </Notice>
      )}
      <PushPrompt publicKey={publicKey} />

      <div className="stagger grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card title="Активность">
          <Link href="/trainer/schedule" className="press flex items-center gap-5">
            <Rings
              size={150}
              rings={[
                { value: todayDone, max: Math.max(todayActive.length, 1), color: "red" },
                { value: weekDone, max: Math.max(weekTotal, 1), color: "green" },
                { value: weekPast - awaiting.filter((s) => s.startsAt >= weekStart).length, max: Math.max(weekPast, 1), color: "blue" },
              ]}
            />
            <RingLegend
              items={[
                { label: "Сегодня", value: todayDone, max: todayActive.length, color: "red" },
                { label: "Неделя", value: weekDone, max: weekTotal, color: "green" },
                { label: "Итоги внесены", value: weekPast - awaiting.filter((s) => s.startsAt >= weekStart).length, max: weekPast, color: "blue" },
              ]}
            />
          </Link>
        </Card>

        <div className="grid grid-cols-2 gap-3 self-end">
          <Link href="/trainer/clients" className="press">
            <Stat label="Клиенты" value={<Digits value={clientsCount} />} color="blue" />
          </Link>
          <a href="#results" className="press">
            <Stat label="Без итогов" value={<Digits value={awaiting.length} />} color={awaiting.length ? "red" : "green"} />
          </a>
        </div>

        <Card title="Сегодня">
          <SessionList sessions={today} href={(id) => `/trainer/sessions/${id}`} empty="Сегодня занятий нет" showClient />
        </Card>
        <div id="results" className="scroll-mt-20">
          <Card title="Внесите итоги">
            <SessionList sessions={awaiting} href={(id) => `/trainer/sessions/${id}`} empty="Все результаты внесены" showClient />
          </Card>
        </div>
      </div>
    </>
  );
}
