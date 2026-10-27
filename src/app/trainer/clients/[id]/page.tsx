import Link from "next/link";
import clsx from "clsx";
import { requireTrainer } from "@/server/auth";
import { orNotFound } from "@/server/page-utils";
import { getClient } from "@/server/services/clients";
import { listPrograms } from "@/server/services/programs";
import { listHistory, listUpcoming } from "@/server/services/sessions";
import { SESSION_DURATIONS, formatDate, formatDateTime, plural } from "@/lib/time";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Empty, Field, Input, LinkButton, Notice, PageHeader, Select, Textarea } from "@/components/ui";
import { SessionList } from "@/components/session-list";
import { HistoryList } from "@/components/history-list";
import { ProgressTabs, type ProgressTab } from "@/components/progress-section";
import { MembershipManager } from "@/components/membership-manager";
import { SummaryCard } from "@/components/summary-card";
import { Badge } from "@/components/badges";
import { RecordsList } from "@/components/records-list";
import { buildSummary } from "@/server/services/summary";
import { listAchievements } from "@/server/services/achievements";
import { listRecords } from "@/server/services/records";
import { BookingForm } from "@/components/booking-form";
import { PushStatus } from "@/components/push-status";
import { FeedbackView } from "@/components/feedback";
import { clientHasPush, listFeedback } from "@/server/services/feedback";
import { TabStrip } from "@/components/tab-strip";
import { addClientNoteAction, deleteClientAction, deleteClientNoteAction, issueInviteAction, setNutritionAction, updateClientProfileAction } from "@/app/actions/trainer";
import { InviteLink } from "@/components/invite-link";
import { SinglePayments } from "@/components/payments";
import { clientBalance } from "@/server/services/payments";

const TABS = [
  ["overview", "Профиль"],
  ["membership", "Оплата"],
  ["programs", "Программы"],
  ["schedule", "Записи"],
  ["history", "История"],
  ["progress", "Прогресс"],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; created?: string; summary?: string; ptab?: string }> }) {
  const { actor } = await requireTrainer();
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? "overview") as Tab;
  const client = await orNotFound(getClient(actor, id));
  const hasPush = await clientHasPush(actor, id);
  const invite = client.user.inviteToken && client.user.inviteExpiresAt && client.user.inviteExpiresAt > new Date() ? client.user : null;

  return (
    <>
      <PageHeader
        eyebrow="Клиент"
        title={client.user.name}
        subtitle={
          <>
            {client.user.email}
            <PushStatus on={hasPush} />
          </>
        }
        action={<LinkButton href={`/trainer/schedule?client=${id}`} variant="secondary">+ Запись</LinkButton>} />
      {sp.created && (
        <Notice>
          {client.user.inviteToken ? "Клиент создан. Отправьте ему ссылку ниже — он сам придумает пароль." : "Клиент создан. Передайте ему email и временный пароль — при первом входе он задаст свой."}
        </Notice>
      )}
      <TabStrip label="Разделы карточки клиента">
        <ul className="inline-flex rounded-full bg-surface p-1">
          {TABS.map(([k, label]) => (
            <li key={k}>
              <Link
                href={`/trainer/clients/${id}?tab=${k}`}
                aria-current={tab === k ? "page" : undefined}
                className={clsx(
                  "press block whitespace-nowrap rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors duration-300",
                  tab === k ? "bg-subtle-2 text-ink" : "text-muted hover:text-ink",
                )}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </TabStrip>

      {tab === "overview" && invite && (
        <Card title="Ссылка для входа" className="mb-5">
          <InviteLink token={invite.inviteToken!} name={client.user.name} until={formatDateTime(invite.inviteExpiresAt!)} />
        </Card>
      )}
      {tab === "overview" && <OverviewExtras />}
      {tab === "membership" && <PaymentTab />}

      {tab === "overview" && (
        <div className="stagger mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <Field label="Длительность тренировки" hint="Подставляется при записи. Уже созданные записи не меняются.">
                <Select name="sessionDurationMin" defaultValue={client.sessionDurationMin}>
                  {SESSION_DURATIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} минут
                    </option>
                  ))}
                </Select>
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
            <p className="mb-3 text-xs text-muted">Видны только вам.</p>
            <ActionForm action={addClientNoteAction.bind(null, id)} resetOnSuccess>
              <Textarea name="text" required maxLength={2000} placeholder="Травмы, предпочтения, договорённости…" />
              <SubmitButton variant="secondary">Добавить заметку</SubmitButton>
            </ActionForm>
            <ul className="mt-4 space-y-2">
              {client.notes?.map((n) => (
                <li key={n.id} className="animate-pop rounded-2xl bg-subtle p-3.5 text-[15px]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-line">{n.text}</p>
                    <ActionForm action={deleteClientNoteAction.bind(null, n.id)} confirm="Удалить заметку?" className="space-y-0">
                      <button className="text-muted hover:text-red-600" aria-label="Удалить">✕</button>
                    </ActionForm>
                  </div>
                  <div className="mt-1 text-xs text-muted">{formatDateTime(n.createdAt)}</div>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Вход в приложение" className="md:col-span-2">
            <p className="mb-3 text-[15px] text-muted">
              Логин: <span className="font-semibold text-ink-2">{client.user.email}</span>.{" "}
              {invite ? "Ссылка для входа отправлена выше и ещё не использована." : "Если клиент забыл пароль или не может войти — создайте новую ссылку и отправьте ему. Он задаст новый пароль."}
            </p>
            <ActionForm action={issueInviteAction.bind(null, id)} confirm={invite ? "Создать новую ссылку? Старая перестанет работать." : undefined}>
              <SubmitButton variant="secondary">{invite ? "Создать новую ссылку" : "Ссылка для входа"}</SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Удаление" className="md:col-span-2">
            <p className="mb-3 text-[15px] text-muted">
              Если клиент ушёл или аккаунт создан с ошибкой, его можно удалить. Вместе с ним
              удалятся все записи, результаты, программы, замеры и абонементы. Отменить это нельзя.
            </p>
            <ActionForm
              action={deleteClientAction.bind(null, id)}
              confirm={`Удалить клиента ${client.user.name} и все его данные? Отменить это нельзя.`}
            >
              <SubmitButton variant="danger">Удалить клиента</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      )}

      {tab === "programs" && <ProgramsTab clientId={id} />}
      {tab === "schedule" && <ScheduleTab clientId={id} />}
      {tab === "history" && <HistoryTab clientId={id} />}
      {tab === "progress" && (
        <ProgressTabs
          actor={actor}
          clientId={id}
          tab={(["exercises", "photos"].includes(sp.ptab ?? "") ? sp.ptab : "body") as ProgressTab}
          hrefFor={(k) => `/trainer/clients/${id}?tab=progress&ptab=${k}`}
        />
      )}
    </>
  );

  async function PaymentTab() {
    const balance = await clientBalance(actor, id);
    return (
      <div className="space-y-5">
        {balance.count > 0 && (
          <Card title="Разовые тренировки — к оплате">
            <SinglePayments clientId={id} sessions={balance.sessions} total={balance.total} />
            {balance.price === null && (
              <p className="mt-3 text-[13px] text-muted">
                Чтобы видеть сумму, укажите цену тренировки на странице{" "}
                <Link href="/trainer/payments" className="font-semibold text-mint">
                  «Оплаты»
                </Link>
                .
              </p>
            )}
          </Card>
        )}
        <MembershipManager actor={actor} clientId={id} />
      </div>
    );
  }

  async function OverviewExtras() {
    const period = sp.summary === "month" ? "month" : "week";
    const [summary, badges, records, feedback] = await Promise.all([buildSummary(actor, id, period), listAchievements(actor, id), listRecords(actor, id, 3), listFeedback(actor, id)]);
    const earned = badges.filter((b) => b.earnedAt);
    return (
      <div className="stagger grid grid-cols-1 gap-5 md:grid-cols-2">
        <SummaryCard text={summary.text} period={period} hrefFor={(p) => `/trainer/clients/${id}?summary=${p}`} />
        <Card title={`Значки · ${earned.length} из ${badges.length}`}>
          {earned.length ? (
            <div className="grid grid-cols-4 gap-2">
              {earned.slice(0, 8).map((b, i) => (
                <Badge key={b.code} b={b} size="sm" index={i} />
              ))}
            </div>
          ) : (
            <p className="text-[15px] text-muted">Пока нет значков</p>
          )}
        </Card>
        {feedback.length > 0 && (
          <Card title="Самочувствие после тренировок" className="md:col-span-2">
            <ul className="divide-y divide-line/60">
              {feedback.map((f) => (
                <li key={f.id}>
                  <Link href={`/trainer/sessions/${f.id}`} className="press -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-subtle/60">
                    <span className="w-24 shrink-0 text-[14px] text-muted">{formatDate(f.startsAt).replace(/ \d{4}$/, "")}</span>
                    <FeedbackView mood={f.feedbackMood} note={f.feedbackNote} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <section className="min-w-0 md:col-span-2">
          <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Последние рекорды</h2>
          <RecordsList records={records} />
        </section>
      </div>
    );
  }

  async function ProgramsTab({ clientId }: { clientId: string }) {
    const programs = await listPrograms(actor, clientId);
    return (
      <Card title="Программы" action={<LinkButton href={`/trainer/clients/${clientId}/programs/new`} variant="ghost">+ Новая</LinkButton>}>
        {programs.length === 0 ? (
          <Empty>Программ пока нет</Empty>
        ) : (
          <ul className="divide-y divide-line/60">
            {programs.map((p) => (
              <li key={p.id}>
                <Link href={`/trainer/programs/${p.id}`} className="press group -mx-2 flex items-center justify-between rounded-xl px-2 py-3 hover:bg-subtle/60">
                  <span>
                    <span className="text-[17px] font-semibold">{p.name}</span>
                    <span className="block text-xs text-muted">
                      {plural(p._count.exercises, ["упражнение", "упражнения", "упражнений"])} · обновлена {formatDate(p.updatedAt)}
                    </span>
                  </span>
                  {p.isActive && <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[13px] font-semibold text-mint">Текущая</span>}
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
      <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Ближайшие занятия">
          <SessionList sessions={upcoming} href={(s) => `/trainer/sessions/${s}`} empty="Нет предстоящих занятий" />
        </Card>
        <Card title="Записать на занятие">
          <BookingForm clients={[{ id: clientId, name: client.user.name, durationMin: client.sessionDurationMin }]} defaultClientId={clientId} />
        </Card>
      </div>
    );
  }

  async function HistoryTab({ clientId }: { clientId: string }) {
    const history = await listHistory(actor, clientId);
    return <HistoryList history={history} hrefBase="/trainer/sessions" />;
  }
}
