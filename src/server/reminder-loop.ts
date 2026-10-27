import { runReminders } from "./services/reminders";
import { runMembershipReminders } from "./services/memberships";
import { runFeedbackRequests } from "./services/feedback";

const INTERVAL_MS = 60_000;
let started = false;

/** Фоновая проверка напоминаний раз в минуту (в процессе сервера). */
export function startReminderLoop() {
  if (started) return;
  started = true;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const n = await runReminders();
      if (n) console.log(`[reminders] отправлено напоминаний: ${n}`);
      const m = await runMembershipReminders();
      if (m) console.log(`[reminders] напоминаний об абонементах: ${m}`);
      const f = await runFeedbackRequests();
      if (f) console.log(`[reminders] вопросов о самочувствии: ${f}`);
    } catch (e) {
      console.error("[reminders] ошибка", e);
    } finally {
      running = false;
    }
  };
  setTimeout(tick, 15_000);
  setInterval(tick, INTERVAL_MS).unref();
  console.log("[reminders] фоновая проверка запущена");
}
