// Напоминания о тренировках: за сутки и за 2 часа до начала — клиенту и тренеру.
import { prisma } from "../db";
import { notify } from "./notifications";
import { formatTime, relativeDayLabel } from "@/lib/time";

export const REMINDER_DAY_MS = 24 * 3_600_000;
export const REMINDER_SOON_MS = 2 * 3_600_000;

type Kind = "day" | "soon";

/**
 * Находит занятия, которым пора отправить напоминание, и отправляет его ровно один раз.
 * Безопасно вызывать часто и из нескольких процессов: отметка ставится атомарно.
 */
export async function runReminders(now: Date = new Date()): Promise<number> {
  let sent = 0;
  for (const kind of ["soon", "day"] as Kind[]) {
    const flag = kind === "day" ? "reminderDaySentAt" : "reminderSoonSentAt";
    const window = kind === "day" ? REMINDER_DAY_MS : REMINDER_SOON_MS;
    const due = await prisma.session.findMany({
      where: {
        status: "SCHEDULED",
        [flag]: null,
        startsAt: { gt: now, lte: new Date(now.getTime() + window) },
      },
      include: {
        client: { select: { userId: true, user: { select: { name: true } } } },
        trainer: { select: { userId: true } },
      },
      take: 200,
    });
    for (const s of due) {
      // «Забираем» напоминание: если другой процесс успел раньше — пропускаем.
      const claimed = await prisma.session.updateMany({
        where: { id: s.id, [flag]: null, status: "SCHEDULED" },
        data: kind === "soon" ? { reminderSoonSentAt: now, reminderDaySentAt: s.reminderDaySentAt ?? now } : { reminderDaySentAt: now },
      });
      if (claimed.count !== 1) continue;
      const at = `${relativeDayLabel(s.startsAt, now)} в ${formatTime(s.startsAt)}`;
      if (kind === "soon") {
        await notify([s.client.userId], { type: "session_reminder", title: "Тренировка через 2 часа ⏰", body: `${at}. До встречи!`, url: `/client/sessions/${s.id}` });
        await notify([s.trainer.userId], { type: "session_reminder", title: `Скоро тренировка: ${s.client.user.name}`, body: at, url: `/trainer/sessions/${s.id}` });
      } else {
        await notify([s.client.userId], {
          type: "session_reminder",
          title: "Напоминание о тренировке",
          body: `${at}. Перенести или отменить можно не позднее чем за 3 часа.`,
          url: `/client/sessions/${s.id}`,
        });
        await notify([s.trainer.userId], { type: "session_reminder", title: `Тренировка: ${s.client.user.name}`, body: at, url: `/trainer/sessions/${s.id}` });
      }
      sent++;
    }
  }
  return sent;
}
