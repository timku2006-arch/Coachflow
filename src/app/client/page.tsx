import Link from "next/link";
import { ArrowUpRight, ClipboardList, History, Scale, Sparkles, Target } from "lucide-react";
import { requireClient } from "@/server/auth";
import { getClient } from "@/server/services/clients";
import { getActiveProgram } from "@/server/services/programs";
import { listUpcoming } from "@/server/services/sessions";
import { clientCanChangeSession, telegramLink } from "@/lib/booking-rules";
import { formatTime, plural, relativeDayLabel, timeUntil } from "@/lib/time";
import { Card, LinkButton, MoreLink, PageHeader, Stat } from "@/components/ui";
import { SessionList } from "@/components/session-list";
import { NutritionCard } from "@/components/nutrition-card";
import { LockedNotice } from "@/components/session-actions";
import { CountUp } from "@/components/count-up";

export const metadata = { title: "Главная" };

export default async function ClientHome() {
  const { user, actor } = await requireClient();
  const [client, upcoming, program] = await Promise.all([
    getClient(actor, actor.clientId),
    listUpcoming(actor, actor.clientId),
    getActiveProgram(actor, actor.clientId),
  ]);
  const next = upcoming[0];
  const lastWeight = client.bodyWeights.at(-1);
  const firstWeight = client.bodyWeights[0];
  const now = new Date();
  return (
    <>
      <PageHeader eyebrow="Твой прогресс" title={`Привет, ${user.name.split(" ")[0]}!`} />
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">Следующая тренировка</div>

      {/* Герой: следующее занятие */}
      {next ? (
        <Link
          href={`/client/sessions/${next.id}`}
          className="group relative mb-4 block animate-rise overflow-hidden rounded-[2rem] bg-brand-gradient p-5 text-white shadow-glow transition-transform duration-300 hover:-translate-y-1 sm:p-6"
        >
          <div aria-hidden className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl transition-transform duration-700 group-hover:scale-125" />
          <div aria-hidden className="absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-[#c8f169]/25 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8f169]" />
                {timeUntil(next.startsAt, now)}
              </div>
              <div className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">{formatTime(next.startsAt)}</div>
              <div className="mt-1 text-sm font-medium text-white/80">
                {relativeDayLabel(next.startsAt, now)} · до {formatTime(next.endsAt)} · тренер {client.trainer.user.name}
              </div>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 transition-transform duration-300 group-hover:rotate-45">
              <ArrowUpRight size={20} />
            </span>
          </div>
        </Link>
      ) : (
        <div className="mb-4 flex animate-rise flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-dashed border-brand-300 bg-brand-50 p-5">
          <div>
            <div className="font-bold">Нет запланированных занятий</div>
            <div className="text-sm text-muted">Выберите удобное время — тренер увидит запись сразу.</div>
          </div>
          <LinkButton href="/client/schedule">Записаться</LinkButton>
        </div>
      )}
      {next && !clientCanChangeSession(next.startsAt) && next.startsAt > now && (
        <div className="mb-4 animate-rise">
          <LockedNotice telegramUrl={telegramLink(client.trainer.telegramUsername)} />
        </div>
      )}

      <div className="stagger mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Stat icon={<Scale size={13} />} label="Вес" value={lastWeight ? <CountUp value={lastWeight.weightKg} decimals={1} /> : "—"} unit={lastWeight ? "кг" : undefined} />
        <Stat
          icon={<Sparkles size={13} />}
          label="С начала"
          value={lastWeight && firstWeight ? <>{lastWeight.weightKg - firstWeight.weightKg >= 0 ? "+" : "−"}<CountUp value={Math.abs(+(lastWeight.weightKg - firstWeight.weightKg).toFixed(1))} decimals={1} /></> : "—"}
          unit={lastWeight ? "кг" : undefined}
        />
        <div className="col-span-2 sm:col-span-1">
          <Stat icon={<Target size={13} />} label="Цель" value={<span className="line-clamp-2 text-sm font-bold leading-snug">{client.goal ?? "Не указана"}</span>} />
        </div>
      </div>

      <div className="stagger grid gap-4 md:grid-cols-2">
        {upcoming.length > 1 && (
          <Card title="Дальше в расписании" action={<MoreLink href="/client/schedule">Все</MoreLink>}>
            <SessionList sessions={upcoming.slice(1, 4)} href={(id) => `/client/sessions/${id}`} empty="" />
          </Card>
        )}
        <NutritionCard nutrition={client.nutrition} />
        <Card title="Текущая программа" icon={<ClipboardList size={15} />} action={<MoreLink href="/client/program">Открыть</MoreLink>}>
          {program ? (
            <Link href="/client/program" className="group block rounded-2xl bg-subtle p-4 transition hover:bg-subtle-2">
              <div className="text-lg font-extrabold tracking-tight">{program.name}</div>
              <div className="mt-0.5 text-sm text-muted">{plural(program.exercises.length, ["упражнение", "упражнения", "упражнений"])}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {program.exercises.slice(0, 4).map((e) => (
                  <span key={e.id} className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-2 shadow-soft">
                    {e.exercise.name}
                  </span>
                ))}
              </div>
            </Link>
          ) : (
            <p className="text-sm text-muted">Тренер ещё не назначил программу.</p>
          )}
        </Card>
        <Card title="История" icon={<History size={15} />} action={<MoreLink href="/client/history">Открыть</MoreLink>}>
          <p className="text-sm text-muted">Все прошедшие тренировки с весами и повторениями.</p>
          <LinkButton href="/client/progress" variant="secondary" className="mt-3 w-full">
            Смотреть графики прогресса
          </LinkButton>
        </Card>
      </div>
    </>
  );
}
