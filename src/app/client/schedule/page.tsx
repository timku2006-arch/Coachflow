import { requireClient } from "@/server/auth";
import { prisma } from "@/server/db";
import { listUpcoming, listWeek } from "@/server/services/sessions";
import { weekStartFromParam } from "@/lib/time";
import { CLIENT_CHANGE_WINDOW_HOURS } from "@/lib/booking-rules";
import { Card, MoreLink, PageHeader } from "@/components/ui";
import { WeekCalendar } from "@/components/week-calendar";
import { BookingForm } from "@/components/booking-form";
import { SessionList } from "@/components/session-list";

export const metadata = { title: "Занятия" };

export default async function ClientSchedule({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { actor } = await requireClient();
  const { week } = await searchParams;
  const weekStart = weekStartFromParam(week);
  const [{ sessions, busy }, upcoming, profile] = await Promise.all([
    listWeek(actor, weekStart),
    listUpcoming(actor, actor.clientId),
    prisma.clientProfile.findUniqueOrThrow({ where: { id: actor.clientId }, select: { sessionDurationMin: true } }),
  ]);
  return (
    <>
      <PageHeader
        title="Мои занятия"
        subtitle={`Время московское. Перенос и отмена — не позднее чем за ${CLIENT_CHANGE_WINDOW_HOURS} часа до начала.`}
        action={<MoreLink href="/client/history">История</MoreLink>}
      />
      <WeekCalendar weekStart={weekStart} sessions={sessions} busy={busy} sessionHref={(id) => `/client/sessions/${id}`} navHref={(w) => `/client/schedule?week=${w}`} />
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card title="Ближайшие">
          <SessionList sessions={upcoming} href={(id) => `/client/sessions/${id}`} empty="Нет запланированных занятий" />
        </Card>
        <Card title="Записаться" id="new">
          <BookingForm durationMin={profile.sessionDurationMin} />
        </Card>
      </div>
    </>
  );
}
