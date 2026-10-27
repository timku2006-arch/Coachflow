import { requireClient } from "@/server/auth";
import { prisma } from "@/server/db";
import { listUpcoming, listWeek } from "@/server/services/sessions";
import { weekStartFromParam } from "@/lib/time";
import { CLIENT_CHANGE_WINDOW_HOURS } from "@/lib/booking-rules";
import { Card, MoreLink, PageHeader } from "@/components/ui";
import { WeekCalendar } from "@/components/week-calendar";
import { BookingForm } from "@/components/booking-form";
import { closedDaysInWeek, getDaysOff } from "@/server/services/days-off";
import { dayOffReason, weeklyOffText } from "@/lib/days-off";
import { addMoscowDays, moscowDateString } from "@/lib/time";
import { SessionList } from "@/components/session-list";

export const metadata = { title: "Занятия" };

export default async function ClientSchedule({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { actor } = await requireClient();
  const { week } = await searchParams;
  const weekStart = weekStartFromParam(week);
  const tomorrow = moscowDateString(addMoscowDays(new Date(), 1));
  const [{ sessions, busy }, upcoming, profile, closed, daysOff] = await Promise.all([
    listWeek(actor, weekStart),
    listUpcoming(actor, actor.clientId),
    prisma.clientProfile.findUniqueOrThrow({ where: { id: actor.clientId }, select: { sessionDurationMin: true } }),
    closedDaysInWeek(actor.trainerId, weekStart),
    getDaysOff(actor.trainerId, tomorrow, moscowDateString(addMoscowDays(new Date(), 60))),
  ]);
  // В форме записи сразу предлагаем ближайший рабочий день
  let firstOpen = tomorrow;
  for (let i = 2; dayOffReason(firstOpen, daysOff) && i <= 60; i++) firstOpen = moscowDateString(addMoscowDays(new Date(), i));
  const offText = weeklyOffText(daysOff.weekly);
  return (
    <>
      <PageHeader
        title="Мои занятия"
        subtitle={`Время московское. Перенос и отмена — не позднее чем за ${CLIENT_CHANGE_WINDOW_HOURS} часа до начала.`}
        action={<MoreLink href="/client/history">История</MoreLink>}
      />
      <WeekCalendar weekStart={weekStart} sessions={sessions} busy={busy} closed={closed} sessionHref={(id) => `/client/sessions/${id}`} navHref={(w) => `/client/schedule?week=${w}`} />
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card title="Ближайшие">
          <SessionList sessions={upcoming} href={(id) => `/client/sessions/${id}`} empty="Нет запланированных занятий" />
        </Card>
        <Card title="Записаться" id="new">
          <BookingForm durationMin={profile.sessionDurationMin} defaultDate={firstOpen} note={offText ? `Выходной у тренера — ${offText}.` : undefined} />
        </Card>
      </div>
    </>
  );
}
