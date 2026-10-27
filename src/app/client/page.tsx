import Link from "next/link";
import { startOfMonth } from "date-fns";
import { CheckCircle2, ChevronRight } from "lucide-react";
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
import { FlowWaves } from "@/components/flow-waves";
import { PushPrompt } from "@/components/push-setup";
import { Welcome } from "@/components/welcome";
import { Gauge, WeekPulse } from "@/components/viz";
import { buildWeekPulse } from "@/lib/week-pulse";
import { listRecords } from "@/server/services/records";
import { currentMembership } from "@/server/services/memberships";
import { buildSummary } from "@/server/services/summary";
import { evaluateAchievements, listAchievements } from "@/server/services/achievements";
import { AttendancePrompt } from "@/components/attendance";
import { MembershipCard } from "@/components/membership-card";
import { SummaryCard } from "@/components/summary-card";
import { RecordBanner } from "@/components/record-banner";
import { Badge } from "@/components/badges";

export const metadata = { title: "Главная" };

export default async function ClientHome({ searchParams }: { searchParams: Promise<{ hello?: string; summary?: string }> }) {
  const { user, actor } = await requireClient();
  const { hello, summary: summaryParam } = await searchParams;
  const period = summaryParam === "month" ? "month" : "week";
  const now = new Date();
  const weekStart = moscowWeekStart(now);
  const monthStart = new Date(startOfMonth(toMoscow(now)).getTime());
  const own = { clientId: actor.clientId };
  const active = { ...own, status: { not: "CANCELLED" as const } };
  // значки «по времени» (например, «Месяц с тренером») проверяем при открытии главной
  await evaluateAchievements(actor.clientId, now);
  const [client, upcoming, program, publicKey, week, monthTotal, monthDone, records, membership, summary, badges] = await Promise.all([
    getClient(actor, actor.clientId),
    listUpcoming(actor, actor.clientId),
    getActiveProgram(actor, actor.clientId),
    vapidPublicKey(),
    prisma.session.findMany({ where: { ...own, startsAt: { gte: weekStart, lt: addMoscowDays(weekStart, 7) } }, select: { startsAt: true, status: true } }),
    prisma.session.count({ where: { ...active, startsAt: { gte: monthStart, lt: new Date(startOfMonth(addMoscowDays(monthStart, 32)).getTime()) } } }),
    prisma.session.count({ where: { ...own, status: "COMPLETED", startsAt: { gte: monthStart, lte: now } } }),
    listRecords(actor, actor.clientId, 10),
    currentMembership(actor, actor.clientId, now),
    buildSummary(actor, actor.clientId, period, now),
    listAchievements(actor, actor.clientId, now),
  ]);
  const weekAgo = addMoscowDays(now, -7);
  const freshRecords = records.filter((r) => r.achievedAt >= weekAgo);
  const askAttendance = upcoming.find((s) => !s.confirmedAt && s.startsAt > now && s.startsAt.getTime() - now.getTime() <= 48 * 3_600_000);
  const earned = badges.filter((b) => b.earnedAt).sort((a, b) => b.earnedAt!.getTime() - a.earnedAt!.getTime());
  const pulse = buildWeekPulse(weekStart, week, now);
  const next = upcoming[0];
  const lastWeight = client.bodyWeights.at(-1);
  const firstWeight = client.bodyWeights[0];
  const delta = lastWeight && firstWeight ? +(lastWeight.weightKg - firstWeight.weightKg).toFixed(1) : null;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <Welcome show={hello === "1"} name={firstName} line={formatLongDate(now)} />
      <PageHeader
        eyebrow={formatLongDate(now)}
        title={
          <>
            Привет, <span className="text-flow">{firstName}</span>
          </>
        }
        subtitle={client.goal ? `Цель: ${client.goal}` : undefined}
      />
      {/* Главное действие — первым и крупно */}
      {askAttendance && <AttendancePrompt session={askAttendance} />}
      {freshRecords[0] && <RecordBanner record={freshRecords[0]} more={freshRecords.length - 1} />}
      <MembershipCard membership={membership} now={now} />
      <PushPrompt publicKey={publicKey} />

      <div className="stagger grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* следующая тренировка */}
        {next ? (
          <section className="min-w-0">
            <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Следующая тренировка</h2>
            <Link
              href={`/client/sessions/${next.id}`}
              className="press glass group relative block overflow-hidden rounded-[2rem] p-5"
            >
              <FlowWaves className="absolute inset-x-0 -bottom-6 h-20 opacity-[0.14]" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-[15px] font-semibold text-mint first-letter:uppercase">{relativeDayLabel(next.startsAt, now)}</div>
                  <div className="mt-1 font-display text-[3.4rem] font-semibold leading-none">{formatTime(next.startsAt)}</div>
                  <div className="mt-1 text-[15px] text-muted">
                    до {formatTime(next.endsAt)} · {client.trainer.user.name}
                  </div>
                  {next.confirmedAt && (
                    <div className="mt-2 flex items-center gap-1.5 text-[16px] font-semibold text-mint">
                      <CheckCircle2 size={18} />
                      Вы придёте — ждём вас!
                    </div>
                  )}
                </div>
                <ChevronRight size={22} className="text-muted transition-transform duration-300 group-hover:translate-x-1" />
              </div>
              <div className="relative mt-5 flex items-end justify-between border-t border-white/[0.06] pt-3">
                <span className="text-[13px] font-semibold text-muted">До начала</span>
                <Countdown to={next.startsAt.toISOString()} className="font-display text-[1.6rem] font-semibold leading-none text-flow" />
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

        <SummaryCard text={summary.text} period={period} hrefFor={(p) => (p === "month" ? "/client?summary=month" : "/client")} />

        <Card title="Мои достижения" action={<MoreLink href="/client/achievements">Все</MoreLink>}>
          {earned.length ? (
            <Link href="/client/achievements" className="press grid grid-cols-3 gap-2">
              {earned.slice(0, 3).map((b, i) => (
                <Badge key={b.code} b={b} size="sm" index={i} />
              ))}
            </Link>
          ) : (
            <Link href="/client/achievements" className="press block text-[17px] text-ink-2">
              Первый значок — после первой тренировки 💫
            </Link>
          )}
        </Card>

        <Card title="Ваша неделя">
          <WeekPulse days={pulse} height={96} />
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <Gauge value={monthDone} max={Math.max(monthTotal, 1)} label="тренировок за месяц" size={190} />
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
                    <span className="shrink-0 font-display text-[14px] font-semibold text-mint">
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
