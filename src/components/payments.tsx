import { Wallet } from "lucide-react";
import { ActionForm, SubmitButton } from "./form";
import { Field, Input } from "./ui";
import { markSessionsPaidAction, setSessionPriceAction } from "@/app/actions/coaching";
import { formatDayMonth, plural } from "@/lib/time";
import { rub } from "@/lib/money";

const trainings = (n: number) => plural(n, ["тренировка", "тренировки", "тренировок"]);

/** Тренер: неоплаченные разовые тренировки клиента и кнопка «Получил перевод». */
export function SinglePayments({ clientId, sessions, total }: { clientId: string; sessions: { id: string; startsAt: Date }[]; total: number | null }) {
  if (sessions.length === 0) return <p className="text-[15px] text-muted">Все разовые тренировки оплачены.</p>;
  return (
    <div className="space-y-3">
      <p className="font-display text-[1.6rem] font-semibold leading-tight">
        {trainings(sessions.length)}
        {total !== null && <span className="whitespace-nowrap text-coral"> · {rub(total)}</span>}
      </p>
      <p className="text-[14px] text-muted">{sessions.map((s) => formatDayMonth(s.startsAt)).join(", ")}</p>
      <PaidButton clientId={clientId} count={sessions.length} total={total} />
    </div>
  );
}

export function PaidButton({ clientId, count, total }: { clientId: string; count: number; total: number | null }) {
  return (
    <ActionForm action={markSessionsPaidAction.bind(null, clientId)} confirm={`Отметить оплату: ${trainings(count)}${total !== null ? ` — ${rub(total)}` : ""}?`}>
      <SubmitButton className="w-full">Получил перевод</SubmitButton>
    </ActionForm>
  );
}

export function SessionPriceForm({ price }: { price: number | null }) {
  return (
    <ActionForm action={setSessionPriceAction}>
      <Field label="Цена разовой тренировки, ₽" hint="Одна для всех клиентов. Тренировки, которые не списались с абонемента, копятся к оплате по этой цене.">
        <Input name="sessionPriceRub" type="number" min={0} inputMode="numeric" defaultValue={price ?? ""} placeholder="Например, 2000" />
      </Field>
      <SubmitButton variant="secondary">Сохранить цену</SubmitButton>
    </ActionForm>
  );
}

/** Клиент: сколько перевести тренеру за проведённые тренировки. */
export function ClientBalanceCard({ count, total }: { count: number; total: number | null }) {
  return (
    <section className="glass mb-5 animate-pop rounded-[2rem] p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-coral/15 text-coral">
          <Wallet size={26} />
        </span>
        <div>
          <p className="font-display text-[1.5rem] font-semibold leading-tight">{total !== null ? `К оплате ${rub(total)}` : `К оплате: ${trainings(count)}`}</p>
          <p className="mt-0.5 text-[15px] text-muted">
            {total !== null ? `За ${trainings(count)}. ` : ""}Переведите тренеру удобным способом.
          </p>
        </div>
      </div>
    </section>
  );
}
