import { requireTrainer } from "@/server/auth";
import { listWeek } from "@/server/services/sessions";
import { listClients } from "@/server/services/clients";
import { weekStartFromParam } from "@/lib/time";
import { Card, PageHeader } from "@/components/ui";
import { WeekCalendar } from "@/components/week-calendar";
import { BookingForm } from "@/components/booking-form";

export const metadata = { title: "Расписание" };

export default async function TrainerSchedule({ searchParams }: { searchParams: Promise<{ week?: string; client?: string }> }) {
  const { actor } = await requireTrainer();
  const params = await searchParams;
  const weekStart = weekStartFromParam(params.week);
  const [{ sessions }, clients] = await Promise.all([listWeek(actor, weekStart), listClients(actor)]);
  return (
    <>
      <PageHeader title="Расписание" subtitle="Все клиенты на неделю · время московское" />
      <WeekCalendar
        weekStart={weekStart}
        sessions={sessions}
        showClient
        sessionHref={(id) => `/trainer/sessions/${id}`}
        navHref={(w) => `/trainer/schedule?week=${w}`}
      />
      <Card title="Новая запись" id="new" className="mt-6 max-w-lg">
        {clients.length === 0 ? (
          <p className="text-sm text-muted">Сначала добавьте клиента.</p>
        ) : (
          <BookingForm clients={clients.map((c) => ({ id: c.id, name: c.user.name }))} defaultClientId={params.client} />
        )}
      </Card>
    </>
  );
}
