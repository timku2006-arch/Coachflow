import { Flame } from "lucide-react";
import { Card, Empty } from "./ui";
import { CountUp } from "./count-up";

type N = { calories: number; proteinG: number; fatG: number; carbsG: number };

const macros = [
  { key: "proteinG", label: "Белки", kcal: 4, color: "from-violet-400 to-violet-600" },
  { key: "fatG", label: "Жиры", kcal: 9, color: "from-amber-300 to-orange-500" },
  { key: "carbsG", label: "Углеводы", kcal: 4, color: "from-lime-300 to-emerald-500" },
] as const;

export function NutritionCard({ nutrition }: { nutrition: N | null }) {
  return (
    <Card title="Питание на день" icon={<Flame size={15} />}>
      {nutrition ? (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tracking-tight">
              <CountUp value={nutrition.calories} />
            </span>
            <span className="text-sm font-semibold text-muted">ккал</span>
          </div>
          <div className="mt-4 space-y-3">
            {macros.map((m, i) => {
              const grams = nutrition[m.key];
              const share = Math.min(100, Math.round(((grams * m.kcal) / nutrition.calories) * 100));
              return (
                <div key={m.key}>
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span className="text-ink-2">{m.label}</span>
                    <span>
                      {grams} г <span className="text-muted">· {share}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-subtle-2">
                    <div
                      className={`h-full origin-left animate-grow rounded-full bg-gradient-to-r ${m.color}`}
                      style={{ width: `${share}%`, animationDelay: `${0.15 + i * 0.12}s` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted">Ориентиры задаёт тренер.</p>
        </>
      ) : (
        <Empty icon={<Flame size={26} />}>Тренер ещё не задал ориентиры</Empty>
      )}
    </Card>
  );
}
