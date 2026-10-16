"use client";

import { useState } from "react";
import { ActionForm, SubmitButton, buttonClass } from "./form";
import type { FormState } from "@/server/action";

export type ProgramItemDraft = { exerciseId: string; dayLabel: string; sets: string; reps: string; weightKg: string; notes: string };
export type ProgramDraft = { name: string; description: string; items: ProgramItemDraft[] };

const cell =
  "w-full rounded-xl bg-subtle px-3 py-2.5 text-base text-ink outline-none transition-colors focus:bg-subtle-2 focus:ring-2 focus:ring-brand-500/60 sm:text-[15px]";

export function ProgramEditor({
  action,
  exercises,
  initial,
  submitLabel,
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  exercises: { id: string; name: string }[];
  initial: ProgramDraft;
  submitLabel: string;
}) {
  const [p, setP] = useState<ProgramDraft>(initial);
  const setItem = (i: number, patch: Partial<ProgramItemDraft>) =>
    setP((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const move = (i: number, d: -1 | 1) =>
    setP((x) => {
      const items = [...x.items];
      const j = i + d;
      if (j < 0 || j >= items.length) return x;
      [items[i], items[j]] = [items[j], items[i]];
      return { ...x, items };
    });
  const add = () =>
    setP((x) => ({
      ...x,
      items: [...x.items, { exerciseId: exercises[0]?.id ?? "", dayLabel: x.items.at(-1)?.dayLabel ?? "", sets: "3", reps: "10", weightKg: "", notes: "" }],
    }));

  return (
    <ActionForm action={action}>
      <input type="hidden" name="program" value={JSON.stringify(p)} />
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-muted">Название</span>
        <input className={cell} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required maxLength={100} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-muted">Описание</span>
        <textarea className={cell} rows={2} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} maxLength={2000} />
      </label>

      <div className="space-y-2">
        {p.items.map((it, i) => (
          <div key={i} className="animate-pop rounded-2xl bg-canvas/60 p-3">
            <div className="flex gap-2">
              <select className={cell} value={it.exerciseId} onChange={(e) => setItem(i, { exerciseId: e.target.value })} aria-label="Упражнение">
                {exercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => move(i, -1)} className="px-2 text-muted hover:text-ink" aria-label="Выше">↑</button>
              <button type="button" onClick={() => move(i, 1)} className="px-2 text-muted hover:text-ink" aria-label="Ниже">↓</button>
              <button type="button" onClick={() => setP({ ...p, items: p.items.filter((_, j) => j !== i) })} className="px-2 text-muted hover:text-brand-500" aria-label="Удалить">✕</button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <label className="text-[12px] font-semibold text-muted">Подходы<input className={cell} inputMode="numeric" value={it.sets} onChange={(e) => setItem(i, { sets: e.target.value })} required /></label>
              <label className="text-[12px] font-semibold text-muted">Повторения<input className={cell} value={it.reps} onChange={(e) => setItem(i, { reps: e.target.value })} required maxLength={30} /></label>
              <label className="text-[12px] font-semibold text-muted">Вес, кг<input className={cell} inputMode="decimal" value={it.weightKg} onChange={(e) => setItem(i, { weightKg: e.target.value.replace(",", ".") })} /></label>
              <label className="text-[12px] font-semibold text-muted">День<input className={cell} value={it.dayLabel} placeholder="A" onChange={(e) => setItem(i, { dayLabel: e.target.value })} maxLength={50} /></label>
            </div>
            <input className={cell + " mt-2"} placeholder="Комментарий (техника, темп, отдых)" value={it.notes} onChange={(e) => setItem(i, { notes: e.target.value })} maxLength={300} />
          </div>
        ))}
      </div>
      {exercises.length === 0 ? (
        <p className="text-sm text-amber-700">Сначала добавьте упражнения в справочник.</p>
      ) : (
        <button type="button" onClick={add} className={buttonClass("secondary")}>+ Упражнение</button>
      )}
      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
