/**
 * Личные рекорды. Результат в упражнении сравнивается так:
 * больше вес — лучше; при том же весе — больше повторений.
 * Первое выполнение упражнения рекордом не считается: сравнивать не с чем.
 */
export type Lift = { weightKg: number; reps: number };

const EPS = 1e-9;
const sameWeight = (a: number, b: number) => Math.abs(a - b) < EPS;

/** Сравнение двух подходов: >0 — первый лучше. */
export function compareLifts(a: Lift, b: Lift): number {
  if (!sameWeight(a.weightKg, b.weightKg)) return a.weightKg - b.weightKg;
  return a.reps - b.reps;
}

/** Лучший подход из списка (или null, если подходов нет). */
export function bestLift(sets: Lift[]): Lift | null {
  let best: Lift | null = null;
  for (const s of sets) if (!best || compareLifts(s, best) > 0) best = s;
  return best ? { weightKg: best.weightKg, reps: best.reps } : null;
}

/** Новый рекорд, если лучше прошлого лучшего. Без прошлых результатов — не рекорд. */
export function isNewRecord(candidate: Lift, previousBest: Lift | null): boolean {
  if (!previousBest) return false;
  return compareLifts(candidate, previousBest) > 0;
}

const kg = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

/** Текст поздравления: «Новый рекорд: жим лёжа 80 кг!» (при том же весе — с повторениями). */
export function recordTitle(exerciseName: string, lift: Lift, previous: Lift | null): string {
  const name = exerciseName.charAt(0).toLowerCase() + exerciseName.slice(1);
  const sameAsBefore = previous && sameWeight(previous.weightKg, lift.weightKg);
  return sameAsBefore ? `Новый рекорд: ${name} ${kg(lift.weightKg)} кг × ${lift.reps}!` : `Новый рекорд: ${name} ${kg(lift.weightKg)} кг!`;
}
