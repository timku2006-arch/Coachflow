"use client";

import { useId, useMemo, useState } from "react";
import clsx from "clsx";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ExerciseSeries } from "@/server/services/progress";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "Europe/Moscow" });
const kg = (v: number) => `${v.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} кг`;

function Chart({ data, dataKey, label }: { data: Record<string, number | string>[]; dataKey: string; label: string }) {
  const gid = useId().replace(/:/g, "");
  const values = data.map((d) => Number(d[dataKey]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(1, (max - min) * 0.2);
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 6, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#7c5cff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`stroke-${gid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#9b80ff" />
              <stop offset="100%" stopColor="#6a45f5" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--c-line)" strokeDasharray="4 6" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "var(--c-muted)" }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={[Math.floor(min - pad), Math.ceil(max + pad)]} tick={{ fontSize: 11, fill: "var(--c-muted)" }} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            cursor={{ stroke: "#7c5cff", strokeOpacity: 0.35, strokeWidth: 2 }}
            labelFormatter={(v) => shortDate(String(v))}
            formatter={(v) => [kg(Number(v)), label]}
            contentStyle={{ borderRadius: 16, border: "1px solid var(--c-line)", background: "var(--c-surface)", color: "var(--c-ink)", fontSize: 13, boxShadow: "0 18px 40px -16px rgb(0 0 0 / .35)" }}
            labelStyle={{ color: "var(--c-muted)", fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={`url(#stroke-${gid})`}
            strokeWidth={3}
            fill={`url(#fill-${gid})`}
            dot={{ r: 0 }}
            activeDot={{ r: 6, fill: "#7c5cff", stroke: "var(--c-surface)", strokeWidth: 3 }}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BodyWeightChart({ points }: { points: { date: string; weightKg: number }[] }) {
  if (points.length < 2) return <p className="py-6 text-center text-sm text-muted">Добавьте минимум две записи веса, чтобы увидеть график.</p>;
  return <Chart data={points} dataKey="weightKg" label="Вес" />;
}

export function ExerciseCharts({ series }: { series: ExerciseSeries[] }) {
  const [selected, setSelected] = useState(series[0]?.exerciseId ?? "");
  const current = useMemo(() => series.find((s) => s.exerciseId === selected), [series, selected]);
  if (series.length === 0) return <p className="py-6 text-center text-sm text-muted">Пока нет проведённых тренировок с результатами.</p>;
  const last = current?.points.at(-1);
  const first = current?.points[0];
  const delta = last && first ? last.maxWeightKg - first.maxWeightKg : 0;
  return (
    <div>
      {/* упражнения — горизонтальные «чипсы» */}
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {series.map((s) => (
          <button
            key={s.exerciseId}
            type="button"
            onClick={() => setSelected(s.exerciseId)}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95",
              s.exerciseId === selected ? "bg-brand-gradient text-white shadow-glow" : "bg-subtle text-ink-2 hover:bg-subtle-2",
            )}
          >
            {s.name}
          </button>
        ))}
      </div>
      {last && (
        <div className="mb-2 flex items-end justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Рабочий вес</div>
            <div className="text-2xl font-extrabold tracking-tight">
              {kg(last.maxWeightKg)} <span className="text-sm font-semibold text-muted">× {last.repsAtMax}</span>
            </div>
          </div>
          {current!.points.length > 1 && (
            <span className={clsx("rounded-full px-2.5 py-1 text-xs font-bold", delta >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-50 text-red-700")}>
              {delta >= 0 ? "▲ +" : "▼ "}
              {kg(delta)}
            </span>
          )}
        </div>
      )}
      <div key={selected} className="animate-page">
        {current && current.points.length >= 2 ? (
          <Chart data={current.points} dataKey="maxWeightKg" label="Рабочий вес" />
        ) : (
          <p className="py-6 text-center text-sm text-muted">По этому упражнению пока одна тренировка.</p>
        )}
      </div>
    </div>
  );
}
