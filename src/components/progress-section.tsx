import type { Actor } from "@/server/actor";
import { getClient } from "@/server/services/clients";
import { exerciseProgress } from "@/server/services/progress";
import { dateOnlyToString, formatDate, moscowDateString } from "@/lib/time";
import { BodyWeightChart, ExerciseCharts } from "./charts";
import { Card, Field, Input, Stat } from "./ui";
import { ActionForm, SubmitButton } from "./form";
import { addBodyWeightAction, deleteBodyWeightAction } from "@/app/actions/sessions";
import { fmtKg } from "./results-list";
import { CountUp } from "./count-up";
import { Dumbbell, Scale } from "lucide-react";

/** Прогресс клиента: вес тела и рабочие веса. Используется и тренером, и клиентом. */
export async function ProgressSection({ actor, clientId }: { actor: Actor; clientId: string }) {
  const [client, series] = await Promise.all([getClient(actor, clientId), exerciseProgress(actor, clientId)]);
  const weights = client.bodyWeights.map((w) => ({ id: w.id, date: dateOnlyToString(w.date), weightKg: w.weightKg }));
  const last = weights.at(-1);
  const first = weights[0];
  const bmi = last && client.heightCm ? last.weightKg / (client.heightCm / 100) ** 2 : null;
  return (
    <div className="stagger grid gap-4 lg:grid-cols-2">
      <Card title="Вес тела" icon={<Scale size={15} />}>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Stat tone="brand" label="Сейчас" value={last ? <CountUp value={last.weightKg} decimals={1} /> : "—"} unit={last ? "кг" : undefined} />
          <Stat
            label="Изменение"
            value={last && first ? <>{last.weightKg - first.weightKg >= 0 ? "+" : "−"}<CountUp value={Math.abs(+(last.weightKg - first.weightKg).toFixed(1))} decimals={1} /></> : "—"}
            unit={last ? "кг" : undefined}
          />
          <Stat label="ИМТ" value={bmi ? <CountUp value={+bmi.toFixed(1)} decimals={1} /> : "—"} />
        </div>
        <BodyWeightChart points={weights.map((w) => ({ date: `${w.date}T12:00:00Z`, weightKg: w.weightKg }))} />
        <ActionForm action={addBodyWeightAction.bind(null, clientId)} className="mt-4 border-t border-line pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Дата">
              <Input name="date" type="date" required defaultValue={moscowDateString(new Date())} />
            </Field>
            <Field label="Вес, кг">
              <Input name="weightKg" inputMode="decimal" type="number" step="0.1" min="20" max="400" required placeholder="70.5" />
            </Field>
          </div>
          <SubmitButton variant="secondary">Записать вес</SubmitButton>
        </ActionForm>
        {weights.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted">Все записи ({weights.length})</summary>
            <ul className="mt-2 divide-y divide-line">
              {[...weights].reverse().map((w) => (
                <li key={w.id} className="flex items-center justify-between py-1.5">
                  <span>{formatDate(new Date(`${w.date}T12:00:00Z`))}</span>
                  <span className="flex items-center gap-2">
                    <b>{fmtKg(w.weightKg)} кг</b>
                    <ActionForm action={deleteBodyWeightAction.bind(null, w.id)} confirm="Удалить запись?" className="space-y-0">
                      <button className="px-1 text-muted hover:text-red-600" aria-label="Удалить">✕</button>
                    </ActionForm>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>
      <Card title="Рабочие веса" icon={<Dumbbell size={15} />}>
        <ExerciseCharts series={series} />
      </Card>
    </div>
  );
}
