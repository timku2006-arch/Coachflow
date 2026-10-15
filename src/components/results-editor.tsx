"use client";

import { useState } from "react";
import { ActionForm, SubmitButton, buttonClass } from "./form";
import { saveResultsAction } from "@/app/actions/sessions";

export type EditorSet = { exerciseId: string; weightKg: string; reps: string };
type Exercise = { id: string; name: string };

/**
 * Карточка результатов: подходы (упражнение, вес, повторения) + заметка к тренировке.
 * Подходы одного упражнения идут подряд; «+ подход» копирует последний подход упражнения.
 */
export function ResultsEditor({
  sessionId,
  exercises,
  initialSets,
  initialNotes,
  completed,
}: {
  sessionId: string;
  exercises: Exercise[];
  initialSets: EditorSet[];
  initialNotes: string;
  completed: boolean;
}) {
  const [sets, setSets] = useState<EditorSet[]>(initialSets);
  const [notes, setNotes] = useState(initialNotes);
  const [newExercise, setNewExercise] = useState("");

  const update = (i: number, patch: Partial<EditorSet>) => setSets((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setSets((s) => s.filter((_, j) => j !== i));
  const addSetAfter = (i: number) =>
    setSets((s) => {
      let last = i;
      while (last + 1 < s.length && s[last + 1].exerciseId === s[i].exerciseId) last++;
      return [...s.slice(0, last + 1), { ...s[last] }, ...s.slice(last + 1)];
    });
  const addExercise = () => {
    if (!newExercise) return;
    setSets((s) => [...s, { exerciseId: newExercise, weightKg: "", reps: "" }]);
    setNewExercise("");
  };

  // Номер подхода внутри упражнения
  const counters = new Map<string, number>();
  const numbered = sets.map((s) => {
    const n = (counters.get(s.exerciseId) ?? 0) + 1;
    counters.set(s.exerciseId, n);
    return n;
  });
  const name = (id: string) => exercises.find((e) => e.id === id)?.name ?? "—";

  return (
    <ActionForm action={saveResultsAction.bind(null, sessionId)}>
      <input type="hidden" name="results" value={JSON.stringify({ notes, sets })} />
      {sets.length === 0 && <p className="text-sm text-slate-500">Добавьте упражнения, выполненные на тренировке.</p>}
      <ul className="space-y-2">
        {sets.map((s, i) => {
          const first = i === 0 || sets[i - 1].exerciseId !== s.exerciseId;
          return (
            <li key={i} className={first ? "pt-2" : ""}>
              {first && <div className="mb-1 text-sm font-semibold">{name(s.exerciseId)}</div>}
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-right text-xs text-slate-400">{numbered[i]}.</span>
                <input
                  aria-label="Вес, кг"
                  inputMode="decimal"
                  placeholder="кг"
                  value={s.weightKg}
                  onChange={(e) => update(i, { weightKg: e.target.value.replace(",", ".") })}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-base sm:text-sm"
                  required
                />
                <span className="text-slate-400">×</span>
                <input
                  aria-label="Повторения"
                  inputMode="numeric"
                  placeholder="повт."
                  value={s.reps}
                  onChange={(e) => update(i, { reps: e.target.value })}
                  className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-base sm:text-sm"
                  required
                />
                <button type="button" onClick={() => addSetAfter(i)} className="rounded-lg px-2 py-1 text-xs text-brand-700 hover:bg-brand-50" title="Добавить подход">
                  + подход
                </button>
                <button type="button" onClick={() => remove(i)} className="ml-auto rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Удалить подход">
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <select value={newExercise} onChange={(e) => setNewExercise(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm">
          <option value="">Добавить упражнение…</option>
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={addExercise} className={buttonClass("secondary")} disabled={!newExercise}>
          Добавить
        </button>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Заметка по тренировке</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm" />
      </label>
      <SubmitButton className="w-full sm:w-auto">{completed ? "Сохранить изменения" : "Сохранить результаты"}</SubmitButton>
    </ActionForm>
  );
}
