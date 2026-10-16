"use client";

import { useId, useMemo, useState } from "react";
import clsx from "clsx";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ExerciseSeries } from "@/server/services/progress";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "Europe/Moscow" });
const kg = (v: number) => `${v.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} кг`;

function Chart({ data, dataKey, label, color = "#a3f93b" }: { data: Record<string, number | string>[]; dataKey: string; label: string; color?: string }) {
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
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#38383a" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#8e8e93" }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={[Math.floor(min - pad), Math.ceil(max + pad)]} tick={{ fontSize: 11, fill: "#8e8e93" }} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            cursor={{ stroke: "#ffffff", strokeOpacity: 0.25, strokeWidth: 1 }}
            labelFormatter={(v) => shortDate(String(v))}
            formatter={(v) => [kg(Number(v)), label]}
            contentStyle={{ borderRadius: 14, border: "none", background: "#2c2c2e", color: "#ffffff", fontSize: 13, boxShadow: "0 20px 40px -10px rgb(0 0 0 / .7)" }}
            labelStyle={{ color: "#8e8e93", fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            fill={`url(#fill-${gid})`}
            dot={{ r: 0 }}
            activeDot={{ r: 6, fill: color, stroke: "#1c1c1e", strokeWidth: 3 }}
            animationDuration={1400}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BodyWeightChart({ points }: { points: { date: string; weightKg: number }[] }) {
  if (points.length < 2) return <p className="py-6 text-center text-sm text-muted">Добавьте минимум две записи веса, чтобы увидеть график.</p>;
  return <Chart data={points} dataKey="weightKg" label="Вес" color="#1ee5ff" />;
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
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
        {series.map((s) => (
          <button
            key={s.exerciseId}
            type="button"
            onClick={() => setSelected(s.exerciseId)}
            className={clsx(
              "press shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition-colors duration-300",
              s.exerciseId === selected ? "bg-brand-500 text-on-brand" : "bg-subtle text-ink-2 hover:bg-subtle-2",
            )}
          >
            {s.name}
          </button>
        ))}
      </div>
      {last && (
        <div className="mb-2 flex items-end justify-between gap-2">
          <div>
            <div className="text-[13px] font-semibold">Рабочий вес</div>
            <div className="font-display text-[1.75rem] font-bold leading-tight text-ring-green">
              {kg(last.maxWeightKg)} <span className="text-lg text-muted">× {last.repsAtMax}</span>
            </div>
          </div>
          {current!.points.length > 1 && (
            <span className={clsx("rounded-full px-2.5 py-1 text-[13px] font-semibold", delta >= 0 ? "bg-brand-500/15 text-brand-500" : "bg-ring-red/15 text-ring-red")}>
              {delta >= 0 ? "▲ +" : "▼ "}
              {kg(delta)}
            </span>
          )}
        </div>
      )}
      <div key={selected} className="animate-page">
        {current && current.points.length >= 2 ? (
          <Chart data={current.points} dataKey="maxWeightKg" label="Рабочий вес" color="#a3f93b" />
        ) : (
          <p className="py-6 text-center text-sm text-muted">По этому упражнению пока одна тренировка.</p>
        )}
      </div>
    </div>
  );
}
