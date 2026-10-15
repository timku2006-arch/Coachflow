import Link from "next/link";
import clsx from "clsx";
import { requireTrainer } from "@/server/auth";
import { orNotFound } from "@/server/page-utils";
import { getClient } from "@/server/services/clients";
import { listPrograms } from "@/server/services/programs";
import { listHistory, listUpcoming } from "@/server/services/sessions";
import { formatDate, formatDateTime, plural } from "@/lib/time";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Empty, Field, Input, LinkButton, PageHeader, Textarea } from "@/components/ui";
import { SessionList } from "@/components/session-list";
import { HistoryList } from "@/components/history-list";
import { ProgressSection } from "@/components/progress-section";
import { BookingForm } from "@/components/booking-form";
import { addClientNoteAction, deleteClientNoteAction, setNutritionAction, updateClientProfileAction } from "@/app/actions/trainer";

const TABS = [
  ["overview", "Профиль"],
  ["programs", "Программы"],
  ["schedule", "Записи"],
  ["history", "История"],
  ["progress", "Прогресс"],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; created?: string }> }) {
  const { actor } = await requireTrainer();
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? "overview") as Tab;
  const client = await orNotFound(getClient(actor, id));

  return (
    <>
      <PageHeader title={client.user.name} subtitle={client.user.email} action={<LinkButton href={`/trainer/schedule?client=${id}`} variant="secondary">+ Запись</LinkButton>} />
      {sp.created && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Клиент создан. Передайте ему email и временный пароль — при первом входе он задаст свой.
        </p>
      )}
      <nav className="-mx-4 mb-4 overflow-x-auto px-4">
        <ul className="flex gap-1">
          {TABS.map(([k, label]) => (
            <li key={k}>
              <Link
                href={`/trainer/clients/${id}?tab=${k}`}
                className={clsx("block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm", tab === k ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600 hover:bg-white/60")}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Профиль">
            <ActionForm action={updateClientProfileAction.bind(null, id)}>
              <Field label="Имя">
                <Input name="name" defaultValue={client.user.name} required maxLength={100} />
              </Field>
              <Field label="Рост, см">
                <Input name="heightCm" type="number" min={100} max={250} defaultValue={client.heightCm ?? ""} />
              </Field>
              <Field label="Цель">
                <Textarea name="goal" defaultValue={client.goal ?? ""} maxLength={500} />
              </Field>
              <SubmitButton variant="secondary">Сохранить</SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Питание: ориентиры на день">
            <ActionForm action={setNutritionAction.bind(null, id)}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Калории, ккал">
                  <Input name="calories" type="number" min={500} max={10000} required defaultValue={client.nutrition?.calories ?? ""} />
                </Field>
                <Field label="Белки, г">
                  <Input name="proteinG" type="number" min={0} max={1000} required defaultValue={client.nutrition?.proteinG ?? ""} />
                </Field>
                <Field label="Жиры, г">
                  <Input name="fatG" type="number" min={0} max={1000} required defaultValue={client.nutrition?.fatG ?? ""} />
                </Field>
                <Field label="Углеводы, г">
                  <Input name="carbsG" type="number" min={0} max={2000} required defaultValue={client.nutrition?.carbsG ?? ""} />
                </Field>
              </div>
              <SubmitButton variant="secondary">Сохранить ориентиры</SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Заметки о клиенте" className="md:col-span-2">
            <p className="mb-3 text-xs text-slate-500">Видны только вам.</p>
            <ActionForm action={addClientNoteAction.bind(null, id)} resetOnSuccess>
              <Textarea name="text" required maxLength={2000} placeholder="Травмы, предпочтения, договорённости…" />
              <SubmitButton variant="secondary">Добавить заметку</SubmitButton>
            </ActionForm>
            <ul className="mt-4 space-y-2">
              {client.notes?.map((n) => (
                <li key={n.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-line">{n.text}</p>
                    <ActionForm action={deleteClientNoteAction.bind(null, n.id)} confirm="Удалить заметку?" className="space-y-0">
                      <button className="text-slate-400 hover:text-red-600" aria-label="Удалить">✕</button>
                    </ActionForm>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === "programs" && <ProgramsTab clientId={id} />}
      {tab === "schedule" && <ScheduleTab clientId={id} />}
      {tab === "history" && <HistoryTab clientId={id} />}
      {tab === "progress" && <ProgressSection actor={actor} clientId={id} />}
    </>
  );

  async function ProgramsTab({ clientId }: { clientId: string }) {
    const programs = await listPrograms(actor, clientId);
    return (
      <Card title="Программы" action={<LinkButton href={`/trainer/clients/${clientId}/programs/new`} variant="ghost">+ Новая</LinkButton>}>
        {programs.length === 0 ? (
          <Empty>Программ пока нет</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {programs.map((p) => (
              <li key={p.id}>
                <Link href={`/trainer/programs/${p.id}`} className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 hover:bg-slate-50">
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="block text-xs text-slate-500">
                      {plural(p._count.exercises, ["упражнение", "упражнения", "упражнений"])} · обновлена {formatDate(p.updatedAt)}
                    </span>
                  </span>
                  {p.isActive && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">Текущая</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  }

  async function ScheduleTab({ clientId }: { clientId: string }) {
    const upcoming = await listUpcoming(actor, clientId, new Date(), 20);
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Ближайшие занятия">
          <SessionList sessions={upcoming} href={(s) => `/trainer/sessions/${s}`} empty="Нет предстоящих занятий" />
        </Card>
        <Card title="Записать на занятие">
          <BookingForm clients={[{ id: clientId, name: client.user.name }]} defaultClientId={clientId} />
        </Card>
      </div>
    );
  }

  async function HistoryTab({ clientId }: { clientId: string }) {
    const history = await listHistory(actor, clientId);
    return <HistoryList history={history} hrefBase="/trainer/sessions" />;
  }
}
