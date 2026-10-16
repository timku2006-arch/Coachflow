import { Flame } from "lucide-react";
import { Card, Empty } from "./ui";
import { Digits } from "./digits";
import { Capsule } from "./viz";

type N = { calories: number; proteinG: number; fatG: number; carbsG: number };

const macros = [
  { key: "proteinG", label: "Белки", kcal: 4, color: "mint", cls: "text-mint" },
  { key: "fatG", label: "Жиры", kcal: 9, color: "coral", cls: "text-coral" },
  { key: "carbsG", label: "Углеводы", kcal: 4, color: "lilac", cls: "text-lilac" },
] as const;

/** Ориентиры питания: калории крупно, БЖУ — капсулы с долей в калориях. */
export function NutritionCard({ nutrition }: { nutrition: N | null }) {
  return (
    <Card title="Питание на день">
      {nutrition ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[2.6rem] font-semibold leading-none">
              <Digits value={nutrition.calories} />
            </span>
            <span className="text-[14px] font-semibold text-muted">ккал</span>
          </div>
          <div className="mt-5 space-y-3.5">
            {macros.map((m, i) => {
              const share = Math.round(((nutrition[m.key] * m.kcal) / nutrition.calories) * 100);
              return (
                <div key={m.key}>
                  <div className="mb-1.5 flex items-baseline justify-between text-[14px]">
                    <span className="font-semibold text-ink-2">{m.label}</span>
                    <span>
                      <span className={`font-display font-semibold ${m.cls}`}>{nutrition[m.key]} г</span>
                      <span className="ml-1.5 text-muted">{share}%</span>
                    </span>
                  </div>
                  <Capsule value={share} max={60} color={m.color} delay={0.1 + i * 0.12} />
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[13px] text-muted">Ориентиры задаёт тренер.</p>
        </>
      ) : (
        <Empty icon={<Flame size={28} strokeWidth={1.6} />}>Тренер ещё не задал ориентиры</Empty>
      )}
    </Card>
  );
}
