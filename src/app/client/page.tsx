import Link from "next/link";
import { startOfMonth } from "date-fns";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/server/db";
import { requireClient } from "@/server/auth";
import { getClient } from "@/server/services/clients";
import { getActiveProgram } from "@/server/services/programs";
import { listUpcoming } from "@/server/services/sessions";
import { vapidPublicKey } from "@/server/services/notifications";
import { clientCanChangeSession, telegramLink } from "@/lib/booking-rules";
import { addMoscowDays, formatLongDate, formatTime, moscowWeekStart, plural, relativeDayLabel, toMoscow } from "@/lib/time";
import { Card, LinkButton, MoreLink, PageHeader, Stat } from "@/components/ui";
import { SessionList } from "@/components/session-list";
import { NutritionCard } from "@/components/nutrition-card";
import { LockedNotice } from "@/components/session-actions";
import { Digits } from "@/components/digits";
import { Countdown } from "@/components/countdown";
import { PushPrompt } from "@/components/push-setup";
import { Welcome } from "@/components/welcome";
import { RingLegend, Rings } from "@/components/rings";

export const metadata = { title: "Сводка" };

export default async function ClientHome({ searchParams }: { searchParams: Promise<{ hello?: string }> }) {
  const { user, actor } = await requireClient();
  const { hello } = await searchParams;
  const now = new Date();
  const weekStart = moscowWeekStart(now);
  const monthStart = new Date(startOfMonth(toMoscow(now)).getTime());
  const own = { clientId: actor.clientId };
  const active = { ...own, status: { not: "CANCELLED" as const } };
  const [client, upcoming, program, publicKey, weekTotal, weekDone, monthTotal, monthDone, last30Done, last30Cancelled] = await Promise.all([
    getClient(actor, actor.clientId),
    listUpcoming(actor, actor.clientId),
    getActiveProgram(actor, actor.clientId),
    vapidPublicKey(),
    prisma.session.count({ where: { ...active, startsAt: { gte: weekStart, lt: addMoscowDays(weekStart, 7) } } }),
    prisma.session.count({ where: { ...own, status: "COMPLETED", startsAt: { gte: weekStart, lt: addMoscowDays(weekStart, 7) } } }),
    prisma.session.count({ where: { ...active, startsAt: { gte: monthStart, lt: addMoscowDays(monthStart, 31) } } }),
    prisma.session.count({ where: { ...own, status: "COMPLETED", startsAt: { gte: monthStart, lte: now } } }),
    prisma.session.count({ where: { ...own, status: "COMPLETED", startsAt: { gte: addMoscowDays(now, -30), lte: now } } }),
    prisma.session.count({ where: { ...own, status: "CANCELLED", startsAt: { gte: addMoscowDays(now, -30), lte: now } } }),
  ]);
  const next = upcoming[0];
  const lastWeight = client.bodyWeights.at(-1);
  const firstWeight = client.bodyWeights[0];
  const delta = lastWeight && firstWeight ? +(lastWeight.weightKg - firstWeight.weightKg).toFixed(1) : null;
  const firstName = user.name.split(" ")[0];
  const attendanceMax = last30Done + last30Cancelled;

  return (
    <>
      <Welcome show={hello === "1"} name={firstName} line={formatLongDate(now)} />
      <PageHeader eyebrow={formatLongDate(now)} title="Сводка" subtitle={`Привет, ${firstName}!`} />
      <PushPrompt publicKey={publicKey} />

      <div className="stagger grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* следующая тренировка */}
        {next ? (
          <section className="min-w-0">
            <h2 className="mb-2 px-1 font-display text-[1.375rem] font-bold">Следующая тренировка</h2>
            <Link
              href={`/client/sessions/${next.id}`}
              className="press group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a2a2e] to-[#141416] p-5"
            >
              <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 animate-breathe rounded-full bg-ring-green/20 blur-3xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-[15px] font-semibold text-brand-500 first-letter:uppercase">{relativeDayLabel(next.startsAt, now)}</div>
                  <div className="font-display text-6xl font-bold leading-none">{formatTime(next.startsAt)}</div>
                  <div className="mt-1 text-[15px] text-muted">
                    до {formatTime(next.endsAt)} · {client.trainer.user.name}
                  </div>
                </div>
                <ChevronRight size={22} className="text-muted transition-transform duration-300 group-hover:translate-x-1" />
              </div>
              <div className="relative mt-4 flex items-end justify-between border-t border-white/10 pt-3">
                <span className="text-[13px] font-semibold text-muted">До начала</span>
                <Countdown to={next.startsAt.toISOString()} className="font-display text-[1.75rem] font-bold leading-none text-brand-500" />
              </div>
            </Link>
            {!clientCanChangeSession(next.startsAt) && next.startsAt > now && (
              <div className="mt-3">
                <LockedNotice telegramUrl={telegramLink(client.trainer.telegramUsername)} />
              </div>
            )}
          </section>
        ) : (
          <Card title="Следующая тренировка">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[15px] text-muted">Пока нет записей. Выберите удобное время.</p>
              <LinkButton href="/client/schedule">Записаться</LinkButton>
            </div>
          </Card>
        )}

        <Card title="Активность">
          <div className="flex items-center gap-5">
            <Rings
              size={150}
              rings={[
                { value: weekDone, max: Math.max(weekTotal, 1), color: "red" },
                { value: monthDone, max: Math.max(monthTotal, 1), color: "green" },
                { value: last30Done, max: Math.max(attendanceMax, 1), color: "blue" },
              ]}
            />
            <RingLegend
              items={[
                { label: "Неделя", value: weekDone, max: weekTotal, color: "red" },
                { label: "Месяц", value: monthDone, max: monthTotal, color: "green" },
                { label: "Посещаемость", value: attendanceMax ? Math.round((last30Done / attendanceMax) * 100) : 100, max: 100, unit: "%", color: "blue" },
              ]}
            />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/client/progress" className="press">
            <Stat label="Вес" value={lastWeight ? <Digits value={lastWeight.weightKg} decimals={1} /> : "—"} unit={lastWeight ? "кг" : undefined} color="green" />
          </Link>
          <Link href="/client/progress" className="press">
            <Stat
              label="С начала"
              value={delta === null ? "—" : <>{delta > 0 ? "+" : delta < 0 ? "−" : ""}<Digits value={Math.abs(delta)} decimals={1} /></>}
              unit={delta === null ? undefined : "кг"}
              color="blue"
            />
          </Link>
          {client.goal && (
            <div className="col-span-2 rounded-3xl bg-surface p-4">
              <div className="text-[13px] font-semibold text-ring-red">Цель</div>
              <div className="mt-0.5 text-[17px] font-semibold">{client.goal}</div>
            </div>
          )}
        </div>

        <NutritionCard nutrition={client.nutrition} />

        {upcoming.length > 1 && (
          <Card title="Дальше" action={<MoreLink href="/client/schedule">Все</MoreLink>}>
            <SessionList sessions={upcoming.slice(1, 4)} href={(id) => `/client/sessions/${id}`} empty="" />
          </Card>
        )}

        <Card title="Программа" action={<MoreLink href="/client/program">Открыть</MoreLink>}>
          {program ? (
            <Link href="/client/program" className="press block">
              <div className="text-[17px] font-semibold">{program.name}</div>
              <div className="text-[13px] text-muted">{plural(program.exercises.length, ["упражнение", "упражнения", "упражнений"])}</div>
              <ul className="mt-2 divide-y divide-line/60">
                {program.exercises.slice(0, 4).map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-3 py-2.5 text-[15px]">
                    <span className="truncate">{e.exercise.name}</span>
                    <span className="shrink-0 font-display font-semibold text-brand-500">
                      {e.sets}×{e.reps}
                    </span>
                  </li>
                ))}
              </ul>
            </Link>
          ) : (
            <p className="text-[15px] text-muted">Тренер ещё не назначил программу.</p>
          )}
        </Card>
      </div>
    </>
  );
}
