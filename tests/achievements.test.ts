import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, countPerfectWeeks, earnedCodes, type AchievementStats } from "@/lib/achievements";

const stats = (p: Partial<AchievementStats>): AchievementStats => ({ completedSessions: 0, records: 0, daysWithTrainer: 0, perfectWeeks: 0, ...p });

describe("правила значков", () => {
  it("коды уникальны", () => {
    const codes = ACHIEVEMENTS.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
  it("новичку ничего не положено", () => {
    expect(earnedCodes(stats({ daysWithTrainer: 40 }))).toEqual([]); // месяц без тренировок не считается
  });
  it("первая, 5, 10 и 25 тренировок", () => {
    expect(earnedCodes(stats({ completedSessions: 1 }))).toEqual(["first_workout"]);
    expect(earnedCodes(stats({ completedSessions: 9 }))).toEqual(["first_workout", "workouts_5"]);
    expect(earnedCodes(stats({ completedSessions: 25 }))).toEqual(["first_workout", "workouts_5", "workouts_10", "workouts_25"]);
  });
  it("рекорд, неделя без пропусков, месяц с тренером", () => {
    expect(earnedCodes(stats({ completedSessions: 2, records: 1, perfectWeeks: 1, daysWithTrainer: 30 }))).toEqual([
      "first_workout", "perfect_week", "first_record", "month_with_trainer",
    ]);
    expect(earnedCodes(stats({ completedSessions: 2, daysWithTrainer: 29 }))).not.toContain("month_with_trainer");
  });
  it("новое правило подхватывается без правок кода сервиса", () => {
    const custom = [...ACHIEVEMENTS, { code: "records_3", title: "3 рекорда", description: "", icon: "trophy" as const, color: "mint" as const, earned: (s: AchievementStats) => s.records >= 3 }];
    expect(earnedCodes(stats({ records: 3 }), custom)).toContain("records_3");
  });
});

describe("неделя без пропусков", () => {
  const S = (weekKey: string, status: "COMPLETED" | "CANCELLED" | "MISSED" | "SCHEDULED", skippedByClient = false) => ({ weekKey, status, skippedByClient });
  it("считаются только завершённые недели с тренировкой и без пропусков клиента", () => {
    expect(
      countPerfectWeeks(
        [
          S("2026-10-05", "COMPLETED"), S("2026-10-05", "COMPLETED"), // идеальная
          S("2026-10-12", "COMPLETED"), S("2026-10-12", "MISSED", true), // неявка
          S("2026-09-28", "COMPLETED"), S("2026-09-28", "CANCELLED", false), // отменил тренер — не вина клиента
          S("2026-10-19", "COMPLETED"), // текущая неделя — ещё не закончилась
        ],
        "2026-10-19",
      ),
    ).toBe(2);
  });
});
