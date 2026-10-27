import Link from "next/link";
import clsx from "clsx";
import type { Actor } from "@/server/actor";
import { exerciseProgress } from "@/server/services/progress";
import { listMeasurements, measurementSeries } from "@/server/services/measurements";
import { listRecords } from "@/server/services/records";
import { listPhotos } from "@/server/services/photos";
import { prisma } from "@/server/db";
import { dateOnlyToString, formatDate, moscowDateString } from "@/lib/time";
import { ExerciseCharts, MetricChart } from "./charts";
import { Card, Field, Input } from "./ui";
import { ActionForm, SubmitButton } from "./form";
import { deleteBodyWeightAction } from "@/app/actions/sessions";
import { deleteMeasurementAction, saveMeasurementAction } from "@/app/actions/coaching";
import { RecordsList } from "./records-list";
import { PhotosPanel } from "./photos-panel";
import { PHOTOS_ENABLED } from "@/lib/features";

export type ProgressTab = "body" | "exercises" | "photos";
const TABS: [ProgressTab, string][] = [
  ["body", "Тело"],
  ["exercises", "Упражнения"],
  ["photos", "Фото"],
].filter(([k]) => k !== "photos" || PHOTOS_ENABLED) as [ProgressTab, string][];
const COLORS = ["#a99bff", "#3ef2c5", "#ff7a59", "#7cd9f0", "#ffc861"];
const num = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });

/** Прогресс клиента вкладками. Используется и клиентом, и тренером. */
export async function ProgressTabs({ actor, clientId, tab: requested, hrefFor }: { actor: Actor; clientId: string; tab: ProgressTab; hrefFor: (t: ProgressTab) => string }) {
  const tab = TABS.some(([k]) => k === requested) ? requested : "body";
  return (
    <>
      <nav className="mb-5 flex rounded-full bg-surface p-1 ring-1 ring-inset ring-white/5" aria-label="Разделы прогресса">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={hrefFor(k)}
            scroll={false}
            className={clsx("press flex-1 rounded-full py-2.5 text-center text-[16px] font-semibold", tab === k ? "bg-subtle-2 text-ink" : "text-muted")}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === "body" && <BodyTab actor={actor} clientId={clientId} />}
      {tab === "exercises" && <ExercisesTab actor={actor} clientId={clientId} />}
      {tab === "photos" && <PhotosTab actor={actor} clientId={clientId} />}
    </>
  );
}

async function BodyTab({ actor, clientId }: { actor: Actor; clientId: string }) {
  const [series, rows, weights] = await Promise.all([
    measurementSeries(actor, clientId),
    listMeasurements(actor, clientId),
    prisma.bodyWeightEntry.findMany({ where: { clientId }, orderBy: { date: "desc" }, take: 60 }),
  ]);
  return (
    <div className="stagger grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card title="Новый замер" className="lg:row-span-2">
        <ActionForm action={saveMeasurementAction.bind(null, clientId)} resetOnSuccess>
          <Field label="Дата">
            <Input name="date" type="date" required defaultValue={moscowDateString(new Date())} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["weightKg", "Вес, кг", "70,5"],
              ["waistCm", "Талия, см", "80"],
              ["hipsCm", "Бёдра, см", "100"],
              ["chestCm", "Грудь, см", "95"],
              ["armCm", "Руки, см", "30"],
            ].map(([name, label, ph]) => (
              <Field key={name} label={label}>
                <Input name={name} type="number" inputMode="decimal" step="0.1" placeholder={ph} className="text-lg" />
              </Field>
            ))}
          </div>
          <p className="text-[14px] text-muted">Можно заполнить только то, что измерили.</p>
          <SubmitButton className="h-14 w-full text-lg">Сохранить</SubmitButton>
        </ActionForm>
      </Card>

      {series.map((s, i) => (
        <Card key={s.key} title={s.label}>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <div className="font-display text-[2rem] font-semibold leading-none">
              {s.last !== null ? num(s.last) : "—"}
              {s.last !== null && <span className="ml-1 text-base text-muted">{s.unit}</span>}
            </div>
            {s.delta !== null && (
              <span className="rounded-full bg-subtle px-3 py-1 text-[15px] font-semibold" style={{ color: COLORS[i % COLORS.length] }}>
                {s.delta > 0 ? "+" : s.delta < 0 ? "−" : ""}
                {num(Math.abs(s.delta))} {s.unit} с первого замера
              </span>
            )}
          </div>
          <MetricChart points={s.points} label={s.label} unit={s.unit} color={COLORS[i % COLORS.length]} />
        </Card>
      ))}

      {(rows.length > 0 || weights.length > 0) && (
        <Card title="История замеров" className="lg:col-span-2">
          <details>
            <summary className="disclosure cursor-pointer text-[16px] font-semibold text-mint">Показать все записи</summary>
            <ul className="mt-3 divide-y divide-line/60 text-[15px]">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span>{formatDate(new Date(`${dateOnlyToString(r.date)}T12:00:00Z`))}</span>
                  <span className="flex-1 truncate text-right text-muted">
                    {[r.waistCm && `талия ${num(r.waistCm)}`, r.hipsCm && `бёдра ${num(r.hipsCm)}`, r.chestCm && `грудь ${num(r.chestCm)}`, r.armCm && `руки ${num(r.armCm)}`].filter(Boolean).join(" · ")}
                  </span>
                  <ActionForm action={deleteMeasurementAction.bind(null, r.id)} confirm="Удалить замер?" className="space-y-0">
                    <button className="press px-2 text-muted hover:text-coral" aria-label="Удалить замер">✕</button>
                  </ActionForm>
                </li>
              ))}
              {weights.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span>{formatDate(new Date(`${dateOnlyToString(w.date)}T12:00:00Z`))}</span>
                  <span className="flex-1 text-right text-muted">вес {num(w.weightKg)} кг</span>
                  <ActionForm action={deleteBodyWeightAction.bind(null, w.id)} confirm="Удалить запись веса?" className="space-y-0">
                    <button className="press px-2 text-muted hover:text-coral" aria-label="Удалить вес">✕</button>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </details>
        </Card>
      )}
    </div>
  );
}

async function ExercisesTab({ actor, clientId }: { actor: Actor; clientId: string }) {
  const [series, records] = await Promise.all([exerciseProgress(actor, clientId), listRecords(actor, clientId)]);
  return (
    <div className="stagger grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card title="Рабочие веса">
        <ExerciseCharts series={series} />
      </Card>
      <section className="min-w-0">
        <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Рекорды</h2>
        <RecordsList records={records} />
      </section>
    </div>
  );
}

async function PhotosTab({ actor, clientId }: { actor: Actor; clientId: string }) {
  const photos = await listPhotos(actor, clientId);
  return <PhotosPanel clientId={clientId} photos={photos} today={moscowDateString(new Date())} />;
}
