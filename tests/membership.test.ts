import { describe, expect, it } from "vitest";
import { coversDate, daysLeft, isExpiringSoon, isLow, pickForWriteOff, remainingText } from "@/lib/membership";

const m = (remainingSessions: number, validFrom: string, validUntil: string) => ({ remainingSessions, validFrom, validUntil });

describe("правила абонемента", () => {
  it("действует только в пределах срока и при ненулевом остатке", () => {
    expect(coversDate(m(3, "2026-10-01", "2026-10-31"), "2026-10-31")).toBe(true);
    expect(coversDate(m(3, "2026-10-01", "2026-10-31"), "2026-11-01")).toBe(false);
    expect(coversDate(m(0, "2026-10-01", "2026-10-31"), "2026-10-15")).toBe(false);
  });
  it("списываем с абонемента, который закончится раньше", () => {
    const a = { id: "a", ...m(5, "2026-10-01", "2026-12-31") };
    const b = { id: "b", ...m(1, "2026-10-01", "2026-10-20") };
    expect(pickForWriteOff([a, b], "2026-10-15")?.id).toBe("b");
    expect(pickForWriteOff([a, b], "2026-10-25")?.id).toBe("a");
    expect(pickForWriteOff([a, b], "2027-01-05")).toBeNull();
  });
  it("пороги напоминаний: ≤ 2 занятий, ≤ 7 дней", () => {
    expect([isLow(3), isLow(2), isLow(0)]).toEqual([false, true, true]);
    expect(daysLeft("2026-10-28", "2026-10-21")).toBe(7);
    expect(isExpiringSoon("2026-10-28", "2026-10-21")).toBe(true);
    expect(isExpiringSoon("2026-10-29", "2026-10-21")).toBe(false);
    expect(isExpiringSoon("2026-10-20", "2026-10-21")).toBe(false); // уже истёк
  });
  it("текст остатка", () => {
    expect([remainingText(4), remainingText(1), remainingText(5), remainingText(0)]).toEqual([
      "Осталось 4 занятия", "Осталось 1 занятие", "Осталось 5 занятий", "Занятия закончились",
    ]);
  });
});
