import { describe, expect, it } from "vitest";
import { clientCanChangeSession, telegramLink } from "@/lib/booking-rules";
import { moscowLocalToDate } from "@/lib/time";

const H = 60 * 60 * 1000;
const M = 60 * 1000;

describe("правило «окно в 3 часа»", () => {
  const start = moscowLocalToDate("2026-10-20", "18:00");
  const before = (ms: number) => new Date(start.getTime() - ms);

  it("ровно 3 часа до начала — нельзя", () => {
    expect(clientCanChangeSession(start, before(3 * H))).toBe(false);
  });
  it("3 часа 1 минута — можно", () => {
    expect(clientCanChangeSession(start, before(3 * H + M))).toBe(true);
  });
  it("2 часа 59 минут — нельзя", () => {
    expect(clientCanChangeSession(start, before(3 * H - M))).toBe(false);
  });
  it("3 часа и 1 мс — можно (строго больше)", () => {
    expect(clientCanChangeSession(start, before(3 * H + 1))).toBe(true);
  });
  it("за сутки — можно, после начала — нельзя", () => {
    expect(clientCanChangeSession(start, before(24 * H))).toBe(true);
    expect(clientCanChangeSession(start, new Date(start.getTime() + M))).toBe(false);
  });
  it("не зависит от часового пояса сервера", () => {
    // Тесты запускаются с TZ=America/New_York; 18:00 МСК = 15:00 UTC
    expect(start.toISOString()).toBe("2026-10-20T15:00:00.000Z");
    const now = new Date("2026-10-20T12:00:00.000Z"); // 15:00 МСК — ровно 3 часа
    expect(clientCanChangeSession(start, now)).toBe(false);
  });
  it("переход через полночь", () => {
    const night = moscowLocalToDate("2026-10-21", "01:30");
    const now = moscowLocalToDate("2026-10-20", "22:29"); // 3 ч 1 мин
    expect(clientCanChangeSession(night, now)).toBe(true);
    expect(clientCanChangeSession(night, moscowLocalToDate("2026-10-20", "22:30"))).toBe(false);
  });
});

describe("ссылка на Telegram", () => {
  it("строит ссылку t.me и убирает @", () => {
    expect(telegramLink("@coach_anna")).toBe("https://t.me/coach_anna");
    expect(telegramLink(null)).toBeNull();
  });
});
