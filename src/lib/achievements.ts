/**
 * Значки за достижения — ЕДИНСТВЕННОЕ место, где описаны правила.
 * Чтобы добавить значок, допишите объект в ACHIEVEMENTS: код (не меняйте после выдачи),
 * название, подпись, иконку и условие по статистике клиента.
 * Если нужна новая метрика — добавьте поле в AchievementStats и посчитайте его
 * в src/server/services/achievements.ts (computeStats).
 */

export type AchievementStats = {
  completedSessions: number; // проведённые тренировки
  records: number; // личные рекорды
  daysWithTrainer: number; // дней с момента, как клиент появился у тренера
  perfectWeeks: number; // прошедшие недели с тренировкой и без пропусков клиента
};

export type BadgeIcon = "sparkles" | "flame" | "medal" | "trophy" | "calendar-check" | "award" | "handshake";

export type AchievementRule = {
  code: string;
  title: string;
  description: string;
  icon: BadgeIcon;
  color: "mint" | "coral" | "lilac";
  earned: (s: AchievementStats) => boolean;
  /** Прогресс к значку для подписи «3 из 5» (необязательно). */
  progress?: (s: AchievementStats) => { value: number; target: number };
};

const workouts = (n: number, title: string, icon: BadgeIcon, color: AchievementRule["color"]): AchievementRule => ({
  code: `workouts_${n}`,
  title,
  description: `${n} проведённых тренировок`,
  icon,
  color,
  earned: (s) => s.completedSessions >= n,
  progress: (s) => ({ value: Math.min(s.completedSessions, n), target: n }),
});

export const ACHIEVEMENTS: AchievementRule[] = [
  {
    code: "first_workout",
    title: "Первая тренировка",
    description: "Начало положено!",
    icon: "sparkles",
    color: "mint",
    earned: (s) => s.completedSessions >= 1,
  },
  workouts(5, "5 тренировок", "flame", "coral"),
  workouts(10, "10 тренировок", "medal", "lilac"),
  workouts(25, "25 тренировок", "trophy", "mint"),
  {
    code: "perfect_week",
    title: "Неделя без пропусков",
    description: "Все занятия недели — на месте",
    icon: "calendar-check",
    color: "lilac",
    earned: (s) => s.perfectWeeks >= 1,
  },
  {
    code: "first_record",
    title: "Первый рекорд",
    description: "Сильнее, чем раньше",
    icon: "award",
    color: "coral",
    earned: (s) => s.records >= 1,
  },
  {
    code: "month_with_trainer",
    title: "Месяц с тренером",
    description: "30 дней вместе",
    icon: "handshake",
    color: "mint",
    earned: (s) => s.daysWithTrainer >= 30 && s.completedSessions >= 1,
    progress: (s) => ({ value: Math.min(s.daysWithTrainer, 30), target: 30 }),
  },
];

/** Какие значки положены при такой статистике. */
export function earnedCodes(stats: AchievementStats, rules: AchievementRule[] = ACHIEVEMENTS): string[] {
  return rules.filter((r) => r.earned(stats)).map((r) => r.code);
}

type WeekSession = { weekKey: string; status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "MISSED"; skippedByClient: boolean };

/**
 * «Неделя без пропусков»: в неделе была хотя бы одна проведённая тренировка
 * и ни одной неявки или отмены со стороны клиента. Текущая (незавершённая) неделя не считается.
 */
export function countPerfectWeeks(sessions: WeekSession[], currentWeekKey: string): number {
  const weeks = new Map<string, { done: number; skipped: number }>();
  for (const s of sessions) {
    if (s.weekKey >= currentWeekKey) continue;
    const w = weeks.get(s.weekKey) ?? { done: 0, skipped: 0 };
    if (s.status === "COMPLETED") w.done++;
    if (s.skippedByClient) w.skipped++;
    weeks.set(s.weekKey, w);
  }
  return [...weeks.values()].filter((w) => w.done > 0 && w.skipped === 0).length;
}
