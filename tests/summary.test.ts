import { describe, expect, it } from "vitest";
import { summaryText, type Summary } from "@/lib/summary";

const base = (p: Partial<Summary>): Summary => ({ period: "week", completed: 0, missed: 0, records: [], exercises: [], measures: [], ...p });

describe("текст итога", () => {
  it("пустая неделя — мягкое приглашение", () => {
    expect(summaryText(base({}))).toEqual({ headline: "Неделя только начинается", lines: ["Тренировок на этой неделе пока не было. Ждём вас!"] });
  });
  it("хорошая неделя без пропусков", () => {
    const t = summaryText(base({ completed: 3, records: [{ exercise: "Жим лёжа", weightKg: 80 }], exercises: [{ exercise: "Присед", deltaKg: 5 }], measures: [{ label: "Талия", delta: -2, unit: "см" }] }));
    expect(t.headline).toBe("Отличная работа: 3 тренировки!");
    expect(t.lines).toEqual(["Новый рекорд: жим лёжа 80 кг!", "Веса растут: присед +5 кг.", "Талия −2 см."]);
  });
  it("с пропусками — без упрёков", () => {
    const t = summaryText(base({ period: "month", completed: 5, missed: 2 }));
    expect(t.headline).toBe("5 тренировок, пропусков: 2");
    expect(t.lines[0]).toMatch(/Пропуски бывают/);
  });
  it("не больше четырёх строк и не больше двух упражнений/замеров", () => {
    const t = summaryText(
      base({
        completed: 2,
        missed: 1,
        records: [{ exercise: "Жим", weightKg: 80 }, { exercise: "Тяга", weightKg: 100 }, { exercise: "Присед", weightKg: 90 }],
        exercises: [{ exercise: "А", deltaKg: 1 }, { exercise: "Б", deltaKg: 2 }, { exercise: "В", deltaKg: 3 }],
        measures: [{ label: "Вес", delta: -1.25, unit: "кг" }, { label: "Талия", delta: -1, unit: "см" }, { label: "Бёдра", delta: -1, unit: "см" }],
      }),
    );
    expect(t.lines.length).toBeLessThanOrEqual(4);
    expect(t.lines[1]).toBe("Новый рекорд: жим 80 кг! И ещё 2 рекорда.");
    expect(t.lines[2]).toBe("Веса растут: а +1 кг, б +2 кг.");
    expect(t.lines[3]).toBe("Вес −1,3 кг, Талия −1 см.");
  });
  it("падение веса в упражнении не выносим как «веса растут»", () => {
    expect(summaryText(base({ completed: 1, exercises: [{ exercise: "Жим", deltaKg: -5 }] })).lines).toEqual([]);
  });
});
