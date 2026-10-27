import type { Actor } from "@/server/actor";
import { listMemberships } from "@/server/services/memberships";
import { addMoscowDays, formatDate, formatDateTime, moscowDateString } from "@/lib/time";
import { daysLeft, isExpiringSoon, isLow, remainingText } from "@/lib/membership";
import { ActionForm, SubmitButton } from "./form";
import { Card, Field, Input } from "./ui";
import { adjustMembershipAction, createMembershipAction, deleteMembershipAction, markPaidAction } from "@/app/actions/coaching";

const d = (s: string) => formatDate(new Date(`${s}T12:00:00Z`));
const reasonLabel: Record<string, string> = { session: "Тренировка", manual: "Корректировка", payment: "Оплата" };

/** Абонементы клиента: текущий, корректировка, оплата, история, новый. */
export async function MembershipManager({ actor, clientId }: { actor: Actor; clientId: string }) {
  const list = await listMemberships(actor, clientId);
  const now = new Date();
  const today = moscowDateString(now);
  const defaultUntil = moscowDateString(addMoscowDays(now, 30));
  return (
    <div className="stagger grid grid-cols-1 gap-5 lg:grid-cols-2">
      {list.length === 0 && (
        <Card title="Абонемент">
          <p className="text-[17px] text-ink-2">У клиента пока нет абонемента.</p>
        </Card>
      )}
      {list.map((m, idx) => {
        const expired = daysLeft(m.validUntil, today) < 0;
        const warn = !expired && (isLow(m.remainingSessions) || isExpiringSoon(m.validUntil, today));
        return (
          <Card key={m.id} title={idx === 0 ? "Текущий абонемент" : `Абонемент до ${d(m.validUntil)}`} className={idx > 0 ? "opacity-80" : undefined}>
            <div className="font-display text-[1.9rem] font-semibold leading-tight">{remainingText(m.remainingSessions)}</div>
            <div className="mt-1 text-[15px] text-muted">
              из {m.totalSessions} · {d(m.validFrom)} — {d(m.validUntil)}
              {m.priceRub !== null && ` · ${m.priceRub.toLocaleString("ru-RU")} ₽`}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[14px] font-semibold">
              <span className={m.paidAt ? "rounded-full bg-mint/12 px-3 py-1 text-mint" : "rounded-full bg-coral/12 px-3 py-1 text-coral"}>
                {m.paidAt ? `Оплачен ${formatDate(m.paidAt)}` : "Не оплачен"}
              </span>
              {expired && <span className="rounded-full bg-subtle px-3 py-1 text-muted">Срок истёк</span>}
              {warn && <span className="rounded-full bg-coral/12 px-3 py-1 text-coral">Пора продлевать</span>}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ActionForm action={adjustMembershipAction.bind(null, m.id)} className="space-y-2">
                <Field label="Остаток занятий">
                  <Input name="remainingSessions" type="number" min={0} max={500} defaultValue={m.remainingSessions} className="text-lg" />
                </Field>
                <Input name="note" placeholder="Причина (необязательно)" maxLength={300} />
                <SubmitButton variant="secondary" className="w-full">Исправить остаток</SubmitButton>
              </ActionForm>
              <div className="space-y-2">
                {!m.paidAt && (
                  <ActionForm action={markPaidAction.bind(null, m.id)} className="space-y-2">
                    <SubmitButton className="h-14 w-full">Отметить оплату</SubmitButton>
                  </ActionForm>
                )}
                <ActionForm action={deleteMembershipAction.bind(null, m.id)} confirm="Удалить абонемент вместе с историей?" className="space-y-2">
                  <SubmitButton variant="danger" className="w-full">Удалить</SubmitButton>
                </ActionForm>
              </div>
            </div>

            {m.entries.length > 0 && (
              <details className="mt-4">
                <summary className="disclosure cursor-pointer text-[15px] font-semibold text-mint">История ({m.entries.length})</summary>
                <ul className="mt-2 divide-y divide-line/60 text-[14px]">
                  {m.entries.map((e) => (
                    <li key={e.id} className="flex justify-between gap-3 py-2">
                      <span className="text-muted">{formatDateTime(e.createdAt)}</span>
                      <span className="flex-1 truncate">
                        {reasonLabel[e.reason] ?? e.reason}
                        {e.session && ` от ${formatDate(e.session.startsAt)}`}
                        {e.note && e.reason !== "session" && ` · ${e.note}`}
                      </span>
                      <span className={e.delta < 0 ? "font-semibold text-coral" : e.delta > 0 ? "font-semibold text-mint" : "text-muted"}>
                        {e.delta > 0 ? `+${e.delta}` : e.delta || "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
        );
      })}

      <Card title="Новый абонемент">
        <ActionForm action={createMembershipAction.bind(null, clientId)} resetOnSuccess>
          <Field label="Количество занятий">
            <Input name="totalSessions" type="number" min={1} max={500} required defaultValue={8} className="text-lg" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Действует с">
              <Input name="validFrom" type="date" required defaultValue={today} />
            </Field>
            <Field label="по">
              <Input name="validUntil" type="date" required defaultValue={defaultUntil} />
            </Field>
          </div>
          <Field label="Цена, ₽ (необязательно)">
            <Input name="priceRub" type="number" min={0} inputMode="numeric" />
          </Field>
          <Input name="note" placeholder="Комментарий (необязательно)" maxLength={300} />
          <label className="flex items-center gap-3 text-[16px]">
            <input name="paid" type="checkbox" className="h-6 w-6 accent-[#3ef2c5]" defaultChecked />
            Оплачен сегодня
          </label>
          <SubmitButton className="h-14 w-full text-lg">Оформить</SubmitButton>
        </ActionForm>
        <p className="mt-3 text-[13px] text-muted">
          Занятие списывается автоматически, когда вы вносите результаты тренировки. Клиент и вы получите напоминание, когда останется 2 занятия или 7 дней.
        </p>
      </Card>
    </div>
  );
}
