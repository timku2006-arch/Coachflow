import { Flame } from "lucide-react";
import { Card, Empty } from "./ui";
import { Digits } from "./digits";
import { Rings } from "./rings";

type N = { calories: number; proteinG: number; fatG: number; carbsG: number };

const macros = [
  { key: "proteinG", label: "Белки", kcal: 4, color: "red", cls: "text-ring-red" },
  { key: "fatG", label: "Жиры", kcal: 9, color: "green", cls: "text-ring-green" },
  { key: "carbsG", label: "Углеводы", kcal: 4, color: "blue", cls: "text-ring-blue" },
] as const;

/** Ориентиры питания: калории крупно, БЖУ — маленькие кольца с долей в калориях. */
export function NutritionCard({ nutrition }: { nutrition: N | null }) {
  return (
    <Card title="Питание">
      {nutrition ? (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[2.75rem] font-bold leading-none">
              <Digits value={nutrition.calories} />
            </span>
            <span className="text-[15px] font-semibold text-muted">ккал в день</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {macros.map((m, i) => {
              const share = Math.round(((nutrition[m.key] * m.kcal) / nutrition.calories) * 100);
              return (
                <div key={m.key} className="flex flex-col items-center rounded-2xl bg-subtle/60 py-3">
                  <Rings size={56} stroke={7} rings={[{ value: share, max: 100, color: m.color }]} delay={0.15 * i} />
                  <div className={`mt-2 font-display text-xl font-bold leading-none ${m.cls}`}>
                    {nutrition[m.key]}
                    <span className="text-[13px]">г</span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {m.label} · {share}%
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[13px] text-muted">Ориентиры задаёт тренер.</p>
        </>
      ) : (
        <Empty icon={<Flame size={28} strokeWidth={1.6} />}>Тренер ещё не задал ориентиры</Empty>
      )}
    </Card>
  );
}
