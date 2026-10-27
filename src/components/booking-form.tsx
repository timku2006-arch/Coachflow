import { ActionForm, SubmitButton } from "./form";
import { Field, Input, Select } from "./ui";
import { createSessionAction } from "@/app/actions/sessions";
import { SESSION_DURATION_MIN, SESSION_DURATIONS, addMoscowDays, moscowDateString } from "@/lib/time";
import { CLIENT_CHANGE_WINDOW_HOURS } from "@/lib/booking-rules";

/**
 * Форма записи. Тренер может выбрать длительность; по умолчанию — длительность клиента из его профиля.
 * Клиент длительность не выбирает: она подставляется сама (durationMin — для подсказки).
 */
export function BookingForm({
  clients,
  defaultClientId,
  defaultDate,
  durationMin = SESSION_DURATION_MIN,
  note,
}: {
  clients?: { id: string; name: string; durationMin?: number }[];
  defaultClientId?: string;
  defaultDate?: string;
  durationMin?: number;
  /** Подсказка клиенту, например о выходных тренера. */
  note?: string;
}) {
  const single = clients?.length === 1 ? clients[0] : undefined;
  return (
    <ActionForm action={createSessionAction}>
      {clients && (
        <Field label="Клиент">
          <Select name="clientId" required defaultValue={defaultClientId ?? ""}>
            <option value="" disabled>
              Выберите клиента
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Дата">
          <Input name="date" type="date" required defaultValue={defaultDate ?? moscowDateString(addMoscowDays(new Date(), 1))} />
        </Field>
        <Field label="Начало (МСК)">
          <Input name="time" type="time" required step={900} defaultValue="10:00" />
        </Field>
      </div>
      {clients ? (
        <Field label="Длительность">
          <Select name="durationMin" defaultValue="">
            <option value="">{single?.durationMin ? `Как обычно — ${single.durationMin} мин` : "Как обычно у клиента"}</option>
            {SESSION_DURATIONS.map((m) => (
              <option key={m} value={m}>
                {m} минут
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <p className="text-xs text-muted">
          Длительность — {durationMin} минут. Запись возможна не позднее чем за {CLIENT_CHANGE_WINDOW_HOURS} часа до начала.
          {note && ` ${note}`}
        </p>
      )}
      <SubmitButton className="w-full sm:w-auto">Записать</SubmitButton>
    </ActionForm>
  );
}
