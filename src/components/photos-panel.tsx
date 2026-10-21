"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Camera, Trash2 } from "lucide-react";
import { buttonClass } from "./button-class";
import { ActionForm, SubmitButton } from "./form";
import { deletePhotoAction } from "@/app/actions/coaching";

type Photo = { id: string; takenOn: string; width: number; height: number };

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Фото «до/после»: загрузка одной кнопкой, сравнение двух фото рядом, лента по датам.
 * По умолчанию сравниваются самое раннее и самое свежее фото.
 */
export function PhotosPanel({ clientId, photos, today }: { clientId: string; photos: Photo[]; today: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [picked, setPicked] = useState<string[]>([]);

  // Сервер отдаёт новые сверху (по дате снимка, затем по загрузке) — переворачиваем: старые первыми.
  const sorted = useMemo(() => [...photos].reverse(), [photos]);
  const pair = useMemo(() => {
    const chosen = sorted.filter((p) => picked.includes(p.id));
    if (chosen.length === 2) return chosen;
    if (sorted.length >= 2) return [sorted[0], sorted[sorted.length - 1]];
    return sorted.length === 1 ? [sorted[0]] : [];
  }, [picked, sorted]);

  async function upload(file: File) {
    setBusy(true);
    setError(undefined);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("takenOn", date);
      const r = await fetch(`/api/clients/${clientId}/photos`, { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Не удалось загрузить фото");
      setPicked([]);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));

  return (
    <div className="space-y-5">
      {/* загрузка — одно действие */}
      <section className="glass rounded-3xl p-4 sm:p-5">
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className={buttonClass("primary") + " h-16 w-full text-lg"}>
          {busy ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" /> Загружаю…
            </>
          ) : (
            <>
              <Camera size={24} /> Добавить фото
            </>
          )}
        </button>
        <label className="mt-3 flex items-center justify-between gap-3 text-[15px] text-muted">
          Дата снимка
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="rounded-xl bg-subtle px-3 py-2 text-ink" />
        </label>
        {error && <p className="mt-3 animate-pop rounded-2xl bg-coral/12 px-4 py-3 text-[15px] text-coral">{error}</p>}
        <p className="mt-3 text-[13px] text-faint">Фото видите только вы и ваш тренер.</p>
      </section>

      {/* сравнение */}
      {pair.length > 0 && (
        <section>
          <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">{pair.length === 2 ? "Было — стало" : "Первое фото"}</h2>
          <div className={clsx("grid gap-3", pair.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:max-w-sm")}>
            {pair.map((p, i) => (
              <figure key={p.id} className="glass animate-pop overflow-hidden rounded-3xl" style={{ animationDelay: `${i * 80}ms` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${p.id}`} alt={`Фото от ${fmt(p.takenOn)}`} className="aspect-[3/4] w-full object-cover" />
                <figcaption className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span>
                    <span className="block text-[13px] font-semibold text-muted">{pair.length === 2 ? (i === 0 ? "Было" : "Стало") : "Фото"}</span>
                    <span className="text-[15px] font-semibold">{fmt(p.takenOn)}</span>
                  </span>
                  <ActionForm action={deletePhotoAction.bind(null, p.id)} confirm="Удалить это фото?" className="space-y-0">
                    <SubmitButton variant="ghost" className="px-2 py-2 text-muted hover:text-coral">
                      <Trash2 size={18} />
                    </SubmitButton>
                  </ActionForm>
                </figcaption>
              </figure>
            ))}
          </div>
          {photos.length > 2 && <p className="mt-2 px-1 text-[14px] text-muted">Чтобы сравнить другие фото, нажмите на два снимка ниже.</p>}
        </section>
      )}

      {/* лента */}
      {photos.length > 0 ? (
        <section>
          <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Все фото</h2>
          <ul className="stagger grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {photos.map((p) => {
              const on = picked.includes(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    aria-pressed={on}
                    className={clsx("press block w-full overflow-hidden rounded-2xl ring-2 transition", on ? "ring-mint" : "ring-transparent")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/photos/${p.id}?size=thumb`} alt={`Фото от ${fmt(p.takenOn)}`} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                    <span className="block bg-surface py-1 text-center text-[12px] font-semibold text-ink-2">{fmt(p.takenOn).replace(/ \d{4} г\.$/, "")}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="px-1 text-[17px] text-ink-2">Добавьте первое фото — через месяц будет с чем сравнить.</p>
      )}
    </div>
  );
}
