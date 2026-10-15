import { Card, Empty, Stat } from "./ui";

export function NutritionCard({ nutrition }: { nutrition: { calories: number; proteinG: number; fatG: number; carbsG: number } | null }) {
  return (
    <Card title="Питание на день">
      {nutrition ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Калории" value={nutrition.calories} unit="ккал" />
            <Stat label="Белки" value={nutrition.proteinG} unit="г" />
            <Stat label="Жиры" value={nutrition.fatG} unit="г" />
            <Stat label="Углеводы" value={nutrition.carbsG} unit="г" />
          </div>
          <p className="mt-2 text-xs text-slate-500">Ориентиры задаёт тренер.</p>
        </>
      ) : (
        <Empty>Тренер ещё не задал ориентиры</Empty>
      )}
    </Card>
  );
}
