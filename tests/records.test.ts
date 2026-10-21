import { describe, expect, it } from "vitest";
import { bestLift, compareLifts, isNewRecord, recordTitle } from "@/lib/records";

describe("определение рекорда", () => {
  it("больший вес — рекорд", () => {
    expect(isNewRecord({ weightKg: 80, reps: 3 }, { weightKg: 77.5, reps: 8 })).toBe(true);
  });
  it("тот же вес, больше повторений — рекорд", () => {
    expect(isNewRecord({ weightKg: 80, reps: 6 }, { weightKg: 80, reps: 5 })).toBe(true);
  });
  it("тот же вес и повторения — не рекорд", () => {
    expect(isNewRecord({ weightKg: 80, reps: 5 }, { weightKg: 80, reps: 5 })).toBe(false);
  });
  it("меньший вес с большим числом повторений — не рекорд", () => {
    expect(isNewRecord({ weightKg: 75, reps: 15 }, { weightKg: 80, reps: 5 })).toBe(false);
  });
  it("первое выполнение упражнения — не рекорд", () => {
    expect(isNewRecord({ weightKg: 100, reps: 1 }, null)).toBe(false);
  });
  it("дробные веса сравниваются без ошибок округления", () => {
    expect(compareLifts({ weightKg: 0.1 + 0.2, reps: 5 }, { weightKg: 0.3, reps: 5 })).toBe(0);
  });
  it("лучший подход: максимальный вес, затем повторения", () => {
    expect(bestLift([{ weightKg: 60, reps: 10 }, { weightKg: 65, reps: 6 }, { weightKg: 65, reps: 8 }, { weightKg: 50, reps: 15 }])).toEqual({ weightKg: 65, reps: 8 });
    expect(bestLift([])).toBeNull();
  });
  it("текст поздравления", () => {
    expect(recordTitle("Жим лёжа", { weightKg: 80, reps: 5 }, { weightKg: 77.5, reps: 5 })).toBe("Новый рекорд: жим лёжа 80 кг!");
    expect(recordTitle("Жим лёжа", { weightKg: 80, reps: 6 }, { weightKg: 80, reps: 5 })).toBe("Новый рекорд: жим лёжа 80 кг × 6!");
  });
});
