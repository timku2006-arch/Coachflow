import Link from "next/link";
import { requireClient } from "@/server/auth";
import { getClient } from "@/server/services/clients";
import { getActiveProgram } from "@/server/services/programs";
import { listUpcoming } from "@/server/services/sessions";
import { clientCanChangeSession, telegramLink } from "@/lib/booking-rules";
import { formatDateTime, formatTime, plural } from "@/lib/time";
import { Card, LinkButton, PageHeader, Stat } from "@/components/ui";
import { SessionList } from "@/components/session-list";
import { NutritionCard } from "@/components/nutrition-card";
import { LockedNotice } from "@/components/session-actions";
import { fmtKg } from "@/components/results-list";

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
  return (
    <>
      <PageHeader title={`Привет, ${user.name.split(" ")[0]}!`} subtitle={client.goal ? `Цель: ${client.goal}` : undefined} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Следующее занятие" action={<Link href="/client/schedule" className="text-sm text-brand-700 hover:underline">Все</Link>}>
          {next ? (
            <div className="space-y-3">
              <Link href={`/client/sessions/${next.id}`} className="block rounded-xl bg-brand-50 p-4 hover:bg-brand-100">
                <div className="text-lg font-semibold first-letter:uppercase">{formatDateTime(next.startsAt)}</div>
                <div className="text-sm text-slate-600">до {formatTime(next.endsAt)} · с тренером {client.trainer.user.name}</div>
              </Link>
              {!clientCanChangeSession(next.startsAt) && next.startsAt > new Date() && (
                <LockedNotice telegramUrl={telegramLink(client.trainer.telegramUsername)} />
              )}
            </div>
          ) : (
            <div className="space-y-3 text-sm text-slate-500">
              <p>Нет запланированных занятий.</p>
              <LinkButton href="/client/schedule">Записаться</LinkButton>
            </div>
          )}
          {upcoming.length > 1 && (
            <div className="mt-3">
              <SessionList sessions={upcoming.slice(1, 4)} href={(id) => `/client/sessions/${id}`} empty="" />
            </div>
          )}
        </Card>
        <NutritionCard nutrition={client.nutrition} />
        <Card title="Текущая программа" action={<Link href="/client/program" className="text-sm text-brand-700 hover:underline">Открыть</Link>}>
          {program ? (
            <>
              <div className="font-medium">{program.name}</div>
              <div className="text-sm text-slate-500">{plural(program.exercises.length, ["упражнение", "упражнения", "упражнений"])}</div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Тренер ещё не назначил программу.</p>
          )}
        </Card>
        <Card title="Прогресс" action={<Link href="/client/progress" className="text-sm text-brand-700 hover:underline">Графики</Link>}>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Вес" value={lastWeight ? fmtKg(lastWeight.weightKg) : "—"} unit={lastWeight ? "кг" : undefined} />
            <Stat label="Рост" value={client.heightCm ?? "—"} unit={client.heightCm ? "см" : undefined} />
          </div>
          <Link href="/client/history" className="mt-3 inline-block text-sm text-brand-700 hover:underline">
            История тренировок →
          </Link>
        </Card>
      </div>
    </>
  );
}
