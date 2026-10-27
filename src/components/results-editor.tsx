"use client";

import { useEffect, useRef, useState } from "react";
import { ActionForm, SubmitButton, buttonClass } from "./form";
import { saveResultsAction, saveResultsDraftAction } from "@/app/actions/sessions";
import { Check, CloudOff, Copy, Plus, X } from "lucide-react";
import { inputClass } from "./input-class";
import type { ResultsDraft } from "@/lib/validation";

const num =
  "rounded-xl bg-subtle px-2 py-2.5 text-center font-display text-lg font-semibold leading-none text-ink outline-none transition-colors focus:bg-subtle-2 focus:ring-2 focus:ring-brand-500/60";

export type EditorSet = { exerciseId: string; weightKg: string; reps: string };
type Exercise = { id: string; name: string };

const storageKey = (sessionId: string) => `coachflow:draft:${sessionId}`;

function readLocal(sessionId: string): ResultsDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    return raw ? (JSON.parse(raw) as ResultsDraft) : null;
  } catch {
    return null;
  }
}
function writeLocal(sessionId: string, d: ResultsDraft | null) {
  try {
    if (d) localStorage.setItem(storageKey(sessionId), JSON.stringify(d));
    else localStorage.removeItem(storageKey(sessionId));
  } catch {
    // нет доступа к хранилищу (приватный режим) — остаётся сохранение на сервере
  }
}

type SaveState = "idle" | "saving" | "saved" | "offline";

/**
 * Карточка результатов: подходы (упражнение, вес, повторения) + заметка к тренировке.
 * Подходы одного упражнения идут подряд; «+ подход» копирует последний подход упражнения.
 *
 * Пока тренировка не завершена, всё введённое сохраняется само: сразу на телефоне
 * и через секунду на сервере. Если связи нет — отправится, когда появится.
 * «Завершить тренировку» записывает результаты, списывает занятие и уведомляет клиента.
 */
export function ResultsEditor({
  sessionId,
  exercises,
  initialSets,
  initialNotes,
  completed,
  draft,
}: {
  sessionId: string;
  exercises: Exercise[];
  initialSets: EditorSet[];
  initialNotes: string;
  completed: boolean;
  draft?: ResultsDraft | null;
}) {
  const live = !completed;
  const [sets, setSets] = useState<EditorSet[]>(draft?.sets ?? initialSets);
  const [notes, setNotes] = useState(draft?.notes ?? initialNotes);
  const [newExercise, setNewExercise] = useState("");
  const [save, setSave] = useState<{ state: SaveState; at?: number }>({ state: draft ? "saved" : "idle", at: draft?.savedAt });
  const touched = useRef(false);
  const pending = useRef<ResultsDraft | null>(null);

  // Черновик на телефоне новее серверного (например, пропадала связь) — берём его.
  useEffect(() => {
    if (!live) return;
    const local = readLocal(sessionId);
    if (local && local.savedAt > (draft?.savedAt ?? 0)) {
      setSets(local.sets);
      setNotes(local.notes);
      pending.current = local;
      void flush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function flush() {
    const d = pending.current;
    if (!d) return;
    setSave((s) => ({ ...s, state: "saving" }));
    let res;
    try {
      res = await saveResultsDraftAction(sessionId, d);
    } catch {
      // сети нет — черновик остаётся на телефоне, повторим позже
      setSave((s) => ({ ...s, state: "offline" }));
      return;
    }
    if (pending.current === d) pending.current = null;
    // Сервер ответил отказом (например, тренировку уже завершили) — повторять бессмысленно.
    setSave(res.error ? { state: "idle" } : { state: "saved", at: d.savedAt });
  }

  // Автосохранение: на телефон сразу, на сервер — через секунду после последнего изменения.
  useEffect(() => {
    if (!live || !touched.current) return;
    const d: ResultsDraft = { sets, notes, savedAt: Date.now() };
    writeLocal(sessionId, d);
    pending.current = d;
    const t = setTimeout(flush, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sets, notes]);

  // Связь вернулась — досылаем; заодно пробуем раз в 15 секунд.
  useEffect(() => {
    if (!live) return;
    const retry = () => pending.current && flush();
    window.addEventListener("online", retry);
    const t = setInterval(retry, 15_000);
    return () => {
      window.removeEventListener("online", retry);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Правки тренера (в отличие от подстановки черновика) запускают автосохранение
  const changeSets = (fn: (prev: EditorSet[]) => EditorSet[]) => {
    touched.current = true;
    setSets(fn);
  };
  const changeNotes = (v: string) => {
    touched.current = true;
    setNotes(v);
  };

  const update = (i: number, patch: Partial<EditorSet>) => changeSets((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => changeSets((s) => s.filter((_, j) => j !== i));
  const addSetAfter = (i: number) =>
    changeSets((s) => {
      let last = i;
      while (last + 1 < s.length && s[last + 1].exerciseId === s[i].exerciseId) last++;
      return [...s.slice(0, last + 1), { ...s[last] }, ...s.slice(last + 1)];
    });
  const addExercise = () => {
    if (!newExercise) return;
    changeSets((s) => [...s, { exerciseId: newExercise, weightKg: "", reps: "" }]);
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
    <ActionForm
      action={saveResultsAction.bind(null, sessionId)}
      onState={(st) => {
        if (st.ok) {
          pending.current = null;
          writeLocal(sessionId, null);
        }
      }}
    >
      {/* Полностью пустые подходы при завершении пропускаем */}
      <input
        type="hidden"
        name="results"
        value={JSON.stringify({
          notes,
          sets: sets.filter((x) => x.weightKg !== "" || x.reps !== "").map((x) => ({ ...x, weightKg: x.weightKg.replace(",", ".") })),
        })}
      />
      {live && <SaveStatus state={save.state} at={save.at} />}
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
                  onChange={(e) => update(i, { weightKg: e.target.value.replace(".", ",") })}
                  className={`w-20 ${num}`}
                  required={!live}
                />
                <span className="text-muted">×</span>
                <input
                  aria-label="Повторения"
                  inputMode="numeric"
                  placeholder="повт"
                  value={s.reps}
                  onChange={(e) => update(i, { reps: e.target.value })}
                  className={`w-16 ${num}`}
                  required={!live}
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
        <textarea value={notes} onChange={(e) => changeNotes(e.target.value)} rows={3} maxLength={2000} className={inputClass} />
      </label>
      {live && <p className="text-[13px] text-muted">Когда тренировка закончится, нажмите кнопку ниже — клиент увидит результаты.</p>}
      <SubmitButton className="w-full sm:w-auto">{completed ? "Сохранить изменения" : "Завершить тренировку"}</SubmitButton>
    </ActionForm>
  );
}

function SaveStatus({ state, at }: { state: SaveState; at?: number }) {
  const time = at ? new Date(at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" }) : "";
  if (state === "offline")
    return (
      <p role="status" className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-[14px] font-semibold text-amber-800">
        <CloudOff size={16} /> Нет связи — всё сохранено на телефоне, отправлю позже
      </p>
    );
  if (state === "saving") return <p className="text-[14px] font-semibold text-muted">Сохраняю…</p>;
  if (state === "saved")
    return (
      <p className="flex items-center gap-1.5 text-[14px] font-semibold text-mint">
        <Check size={16} /> Сохранено {time}
      </p>
    );
  return <p className="text-[14px] text-muted">Вводите подходы по ходу тренировки — всё сохраняется само.</p>;
}
