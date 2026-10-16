// Только для Node.js-сервера: фоновые напоминания о тренировках.
import { startReminderLoop } from "./server/reminder-loop";

if (process.env.NEXT_PHASE !== "phase-production-build" && process.env.DISABLE_REMINDERS !== "1") {
  startReminderLoop();
}
