"use client";

import { useState } from "react";
import { ActionForm, SubmitButton, buttonClass } from "./form";
import { saveResultsAction } from "@/app/actions/sessions";
import { Copy, Plus, X } from "lucide-react";
import { inputClass } from "./input-class";

const num =
  "rounded-xl bg-subtle px-2 py-2.5 text-center font-display text-lg font-semibold leading-none text-ink outline-none transition-colors focus:bg-subtle-2 focus:ring-2 focus:ring-brand-500/60";

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
      {sets.length === 0 && <p className="text-sm text-muted">Добавьте упражнения, выполненные на тренировке.</p>}
      <ul className="space-y-2">
        {sets.map((s, i) => {
          const first = i === 0 || sets[i - 1].exerciseId !== s.exerciseId;
          return (
            <li key={i} className={first ? "animate-rise pt-3" : "animate-rise"}>
              {first && <div className="mb-2 text-[17px] font-semibold">{name(s.exerciseId)}</div>}
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-right font-display text-[15px] font-semibold text-muted">{numbered[i]}</span>
                <input
                  aria-label="Вес, кг"
                  inputMode="decimal"
                  placeholder="кг"
                  value={s.weightKg}
                  onChange={(e) => update(i, { weightKg: e.target.value.replace(",", ".") })}
                  className={`w-20 ${num}`}
                  required
                />
                <span className="text-muted">×</span>
                <input
                  aria-label="Повторения"
                  inputMode="numeric"
                  placeholder="повт"
                  value={s.reps}
                  onChange={(e) => update(i, { reps: e.target.value })}
                  className={`w-16 ${num}`}
                  required
                />
                <button type="button" onClick={() => addSetAfter(i)} className="press flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-mint hover:bg-subtle" title="Повторить подход">
                  <Copy size={13} /> подход
                </button>
                <button type="button" onClick={() => remove(i)} className="press ml-auto flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-red-600/15 hover:text-red-600" aria-label="Удалить подход">
                  <X size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <select value={newExercise} onChange={(e) => setNewExercise(e.target.value)} className={`min-w-0 flex-1 ${inputClass}`}>
          <option value="">Добавить упражнение…</option>
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={addExercise} className={buttonClass("secondary")} disabled={!newExercise}>
          <Plus size={16} /> Добавить
        </button>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-muted">Заметка по тренировке</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} className={inputClass} />
      </label>
      <SubmitButton className="w-full sm:w-auto">{completed ? "Сохранить изменения" : "Сохранить результаты"}</SubmitButton>
    </ActionForm>
  );
}
