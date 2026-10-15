import { describe, expect, it } from "vitest";
import { moscowLocalToDate, moscowWeekStart, weekStartFromParam, moscowDateString, isDateString } from "@/lib/time";

describe("время по Москве", () => {
  it("переводит местное время в UTC (МСК = UTC+3)", () => {
    expect(moscowLocalToDate("2026-01-05", "09:00").toISOString()).toBe("2026-01-05T06:00:00.000Z");
  });
  it("неделя начинается в понедельник 00:00 МСК", () => {
    const sunLate = moscowLocalToDate("2026-10-18", "23:30");
    expect(moscowWeekStart(sunLate).toISOString()).toBe("2026-10-11T21:00:00.000Z");
    expect(moscowDateString(weekStartFromParam("2026-10-15"))).toBe("2026-10-12");
  });
  it("проверяет даты", () => {
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("2026-02-28")).toBe(true);
  });
});

describe("склонение", () => {
  it("работает для 1, 2, 5, 11, 21, 104", async () => {
    const { plural } = await import("@/lib/time");
    const f: [string, string, string] = ["упражнение", "упражнения", "упражнений"];
    expect([1, 2, 5, 11, 21, 104].map((n) => plural(n, f))).toEqual([
      "1 упражнение", "2 упражнения", "5 упражнений", "11 упражнений", "21 упражнение", "104 упражнения",
    ]);
  });
});
