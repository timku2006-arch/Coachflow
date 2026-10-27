import Link from "next/link";
import { startOfDay } from "date-fns";
import { Dumbbell, Plus } from "lucide-react";
import { prisma } from "@/server/db";
import { requireTrainer } from "@/server/auth";
import { listAwaitingResults } from "@/server/services/sessions";
import { vapidPublicKey } from "@/server/services/notifications";
import { addMoscowDays, formatLongDate, formatTime, moscowWeekStart, plural, toMoscow } from "@/lib/time";
import { isLive } from "@/lib/session-phase";
import { buildWeekPulse } from "@/lib/week-pulse";
import { Card, LinkButton, Notice, PageHeader, Stat } from "@/components/ui";
import { SessionList } from "@/components/session-list";
import { Digits } from "@/components/digits";
import { PushPrompt } from "@/components/push-setup";
import { Welcome } from "@/components/welcome";
import { Gauge, WeekPulse } from "@/components/viz";

export const metadata = { title: "Главная" };

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
  const [today, awaiting, clientsCount, week, publicKey] = await Promise.all([
    prisma.session.findMany({
      where: { trainerId: actor.trainerId, startsAt: { gte: dayStart, lt: addMoscowDays(dayStart, 1) } },
      include: { client: { include: { user: { select: { name: true } } } } },
      orderBy: { startsAt: "asc" },
    }),
    listAwaitingResults(actor, now),
    prisma.clientProfile.count({ where: { trainerId: actor.trainerId } }),
    prisma.session.findMany({
      where: { trainerId: actor.trainerId, startsAt: { gte: weekStart, lt: addMoscowDays(weekStart, 7) } },
      select: { startsAt: true, status: true },
    }),
    vapidPublicKey(),
  ]);
  const pulse = buildWeekPulse(weekStart, week, now);
  const weekPlanned = pulse.reduce((a, d) => a + d.planned, 0);
  const weekDone = pulse.reduce((a, d) => a + d.done, 0);
  const todayActive = today.filter((s) => s.status !== "CANCELLED");
  const firstName = user.name.split(" ")[0];
  const live = today.find((s) => isLive(s, now));

  return (
    <>
      <Welcome show={hello === "1"} name={firstName} line={formatLongDate(now)} />
      <PageHeader
        eyebrow={formatLongDate(now)}
        title={
          <>
            {greeting(now)},
            <br />
            <span className="text-flow">{firstName}</span>
          </>
        }
        subtitle={todayActive.length ? `Сегодня ${plural(todayActive.length, ["тренировка", "тренировки", "тренировок"])}` : "Сегодня тренировок нет"}
        action={
          <LinkButton href="/trainer/schedule#new">
            <Plus size={18} strokeWidth={2.5} /> Записать клиента
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
      {live && (
        <Link href={`/trainer/sessions/${live.id}`} className="press glass mb-5 flex animate-pop items-center gap-4 rounded-[2rem] p-5 ring-1 ring-inset ring-mint/30">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mint text-on-brand shadow-glow">
            <Dumbbell size={28} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold uppercase tracking-[0.12em] text-mint">
              {live.startsAt > now ? "Скоро тренировка" : "Идёт тренировка"} · {formatTime(live.startsAt)}–{formatTime(live.endsAt)}
            </span>
            <span className="block truncate font-display text-[1.35rem] font-semibold">{live.client.user.name}</span>
            <span className="block text-[15px] text-muted">Вносить подходы →</span>
          </span>
        </Link>
      )}

      {/* На широком экране — две независимые колонки, чтобы короткие блоки не оставляли дыр */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-start">
        <div className="stagger space-y-5">
          <Card title="Ваша неделя">
            <Gauge value={weekDone} max={Math.max(weekPlanned, 1)} label="тренировок проведено" sub={weekPlanned ? `осталось ${weekPlanned - weekDone}` : "на этой неделе пока пусто"} />
            <div className="mt-5">
              <WeekPulse days={pulse} />
            </div>
            <div className="mt-4 flex gap-4 text-[12px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-mint" />
                проведено
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-lilac/60" />
                запланировано
              </span>
            </div>
          </Card>
          <Card title="Внесите итоги" className="hidden md:block">
            <SessionList sessions={awaiting} href={(id) => `/trainer/sessions/${id}`} empty="Все результаты внесены" showClient />
          </Card>
        </div>

        <div className="stagger space-y-5">
          <div className="grid grid-cols-2 gap-3">
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
          <Card title="Внесите итоги" id="results" className="md:hidden">
            <SessionList sessions={awaiting} href={(id) => `/trainer/sessions/${id}`} empty="Все результаты внесены" showClient />
          </Card>
        </div>
      </div>
    </>
  );
}
