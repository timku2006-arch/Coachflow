import { requireTrainer } from "@/server/auth";
import { listWeek } from "@/server/services/sessions";
import { listClients } from "@/server/services/clients";
import { weekStartFromParam } from "@/lib/time";
import { Card, PageHeader } from "@/components/ui";
import { WeekCalendar } from "@/components/week-calendar";
import { BookingForm } from "@/components/booking-form";
import { TimeOffManager } from "@/components/time-off";
import { closedDaysInWeek, listTimeOff } from "@/server/services/days-off";

export const metadata = { title: "Расписание" };

export default async function TrainerSchedule({ searchParams }: { searchParams: Promise<{ week?: string; client?: string }> }) {
  const { actor } = await requireTrainer();
  const params = await searchParams;
  const weekStart = weekStartFromParam(params.week);
  const [{ sessions }, clients, closed, periods] = await Promise.all([
    listWeek(actor, weekStart),
    listClients(actor),
    closedDaysInWeek(actor.trainerId, weekStart),
    listTimeOff(actor),
  ]);
  return (
    <>
      <PageHeader title="Расписание" subtitle="Все клиенты на неделю · время московское" />
      <WeekCalendar
        weekStart={weekStart}
        sessions={sessions}
        showClient
        sessionHref={(id) => `/trainer/sessions/${id}`}
        navHref={(w) => `/trainer/schedule?week=${w}`}
        closed={closed}
      />
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 md:items-start">
        <Card title="Новая запись" id="new">
          {clients.length === 0 ? (
            <p className="text-sm text-muted">Сначала добавьте клиента.</p>
          ) : (
            <BookingForm clients={clients.map((c) => ({ id: c.id, name: c.user.name }))} defaultClientId={params.client} />
          )}
        </Card>
        <Card title="Больничный или отпуск" id="time-off">
          <TimeOffManager periods={periods} />
        </Card>
      </div>
    </>
  );
}
