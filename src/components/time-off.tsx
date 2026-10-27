import { CalendarOff, X } from "lucide-react";
import { ActionForm, SubmitButton } from "./form";
import { Field, Input, Select } from "./ui";
import { createTimeOffAction, deleteTimeOffAction, setWeeklyDaysOffAction } from "@/app/actions/coaching";
import { TIME_OFF_REASONS, WEEKDAYS, dayOffLabel, type TimeOffReason } from "@/lib/days-off";
import { dateOnlyToString, formatDayMonth, moscowDateString } from "@/lib/time";

type Period = { id: string; startsOn: Date; endsOn: Date; reason: string };

const range = (p: Period) => {
  const a = dateOnlyToString(p.startsOn);
  const b = dateOnlyToString(p.endsOn);
  const f = (d: string) => formatDayMonth(new Date(`${d}T12:00:00Z`));
  return a === b ? f(a) : `${f(a)} — ${f(b)}`;
};

/** «Не работаю в эти дни»: больничный, отпуск. Занятия в эти дни отменяются, клиенты получают уведомление. */
export function TimeOffManager({ periods }: { periods: Period[] }) {
  const today = moscowDateString(new Date());
  return (
    <div className="space-y-4">
      {periods.length > 0 && (
        <ul className="space-y-2">
          {periods.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-subtle px-4 py-3">
              <CalendarOff size={18} className="shrink-0 text-coral" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{range(p)}</span>
                <span className="block text-[13px] text-muted">{dayOffLabel[p.reason as TimeOffReason] ?? "Не работаю"}</span>
              </span>
              <ActionForm action={deleteTimeOffAction.bind(null, p.id)} confirm="Убрать эти дни? Отменённые занятия не восстановятся — клиенты смогут записаться заново." className="space-y-0">
                <button className="press flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-subtle-2 hover:text-ink" aria-label="Убрать">
                  <X size={17} />
                </button>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={createTimeOffAction} confirm="Все занятия в эти дни будут отменены, клиенты получат уведомление. Продолжить?" resetOnSuccess>
        <div className="grid grid-cols-2 gap-3">
          <Field label="С">
            <Input name="startsOn" type="date" required min={today} defaultValue={today} />
          </Field>
          <Field label="По">
            <Input name="endsOn" type="date" required min={today} defaultValue={today} />
          </Field>
        </div>
        <Field label="Причина" hint="Клиенты увидят: «Тренер заболел», «Тренер в отпуске» или «Тренер не работает в этот день».">
          <Select name="reason" defaultValue="sick">
            {TIME_OFF_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <SubmitButton variant="danger" className="w-full">
          Не работаю в эти дни
        </SubmitButton>
      </ActionForm>
    </div>
  );
}

/** Постоянные выходные: дни недели, в которые клиенты не могут записаться. */
export function WeeklyDaysOffForm({ days }: { days: number[] }) {
  return (
    <ActionForm action={setWeeklyDaysOffAction}>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <label key={d.value} className="cursor-pointer">
            <input type="checkbox" name="weeklyOff" value={d.value} defaultChecked={days.includes(d.value)} className="peer sr-only" />
            <span className="press flex h-12 items-center justify-center rounded-2xl bg-subtle text-[15px] font-semibold text-ink-2 transition-colors peer-checked:bg-coral/20 peer-checked:text-coral peer-focus-visible:ring-2 peer-focus-visible:ring-mint">
              {d.short}
            </span>
          </label>
        ))}
      </div>
      <p className="text-[13px] text-muted">Отмеченные дни — выходные: клиенты не смогут на них записаться. Вы сами записать клиента можете в любой день.</p>
      <SubmitButton variant="secondary">Сохранить выходные</SubmitButton>
    </ActionForm>
  );
}
