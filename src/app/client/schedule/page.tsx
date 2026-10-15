import Link from "next/link";
import { requireClient } from "@/server/auth";
import { listUpcoming, listWeek } from "@/server/services/sessions";
import { weekStartFromParam } from "@/lib/time";
import { CLIENT_CHANGE_WINDOW_HOURS } from "@/lib/booking-rules";
import { Card, PageHeader } from "@/components/ui";
import { WeekCalendar } from "@/components/week-calendar";
import { BookingForm } from "@/components/booking-form";
import { SessionList } from "@/components/session-list";

export const metadata = { title: "Занятия" };

export default async function ClientSchedule({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { actor } = await requireClient();
  const { week } = await searchParams;
  const weekStart = weekStartFromParam(week);
  const [{ sessions, busy }, upcoming] = await Promise.all([listWeek(actor, weekStart), listUpcoming(actor, actor.clientId)]);
  return (
    <>
      <PageHeader
        title="Мои занятия"
        subtitle={`Время московское. Перенос и отмена — не позднее чем за ${CLIENT_CHANGE_WINDOW_HOURS} часа до начала.`}
        action={<Link href="/client/history" className="text-sm text-brand-700 hover:underline">История →</Link>}
      />
      <WeekCalendar weekStart={weekStart} sessions={sessions} busy={busy} sessionHref={(id) => `/client/sessions/${id}`} navHref={(w) => `/client/schedule?week=${w}`} />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="Ближайшие">
          <SessionList sessions={upcoming} href={(id) => `/client/sessions/${id}`} empty="Нет запланированных занятий" />
        </Card>
        <Card title="Записаться">
          <BookingForm />
        </Card>
      </div>
    </>
  );
}
