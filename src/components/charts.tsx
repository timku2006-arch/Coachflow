"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ExerciseSeries } from "@/server/services/progress";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "Europe/Moscow" });
const kg = (v: number) => `${v.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} кг`;

function Chart({ data, dataKey, label }: { data: Record<string, number | string>[]; dataKey: string; label: string }) {
  const values = data.map((d) => Number(d[dataKey]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(1, (max - min) * 0.15);
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis
            domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            labelFormatter={(v) => shortDate(String(v))}
            formatter={(v) => [kg(Number(v)), label]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
          />
          <Line isAnimationActive={false} type="monotone" dataKey={dataKey} stroke="#0d9470" strokeWidth={2.5} dot={{ r: 3, fill: "#0d9470" }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BodyWeightChart({ points }: { points: { date: string; weightKg: number }[] }) {
  if (points.length < 2) return <p className="text-sm text-slate-500">Добавьте минимум две записи веса, чтобы увидеть график.</p>;
  return <Chart data={points} dataKey="weightKg" label="Вес" />;
}

export function ExerciseCharts({ series }: { series: ExerciseSeries[] }) {
  const [selected, setSelected] = useState(series[0]?.exerciseId ?? "");
  const current = useMemo(() => series.find((s) => s.exerciseId === selected), [series, selected]);
  if (series.length === 0) return <p className="text-sm text-slate-500">Пока нет проведённых тренировок с результатами.</p>;
  const last = current?.points.at(-1);
  const first = current?.points[0];
  const delta = last && first ? last.maxWeightKg - first.maxWeightKg : 0;
  return (
    <div>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base sm:w-auto sm:text-sm"
        aria-label="Упражнение"
      >
        {series.map((s) => (
          <option key={s.exerciseId} value={s.exerciseId}>
            {s.name}
          </option>
        ))}
      </select>
      {current && current.points.length >= 2 ? (
        <Chart data={current.points} dataKey="maxWeightKg" label="Рабочий вес" />
      ) : (
        <p className="text-sm text-slate-500">По этому упражнению пока одна тренировка.</p>
      )}
      {last && (
        <p className="mt-2 text-sm text-slate-600">
          Последний рабочий вес: <b>{kg(last.maxWeightKg)}</b> × {last.repsAtMax}
          {current!.points.length > 1 && (
            <span className={delta >= 0 ? "ml-2 text-emerald-700" : "ml-2 text-red-600"}>
              ({delta >= 0 ? "+" : ""}
              {kg(delta)} с начала)
            </span>
          )}
        </p>
      )}
    </div>
  );
}
