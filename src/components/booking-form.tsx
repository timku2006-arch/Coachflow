import { ActionForm, SubmitButton } from "./form";
import { Field, Input, Select } from "./ui";
import { createSessionAction } from "@/app/actions/sessions";
import { SESSION_DURATION_MIN, addMoscowDays, moscowDateString } from "@/lib/time";
import { CLIENT_CHANGE_WINDOW_HOURS } from "@/lib/booking-rules";

export function BookingForm({ clients, defaultClientId, defaultDate }: { clients?: { id: string; name: string }[]; defaultClientId?: string; defaultDate?: string }) {
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
      <p className="text-xs text-muted">
        Длительность — {SESSION_DURATION_MIN} минут.
        {!clients && ` Запись возможна не позднее чем за ${CLIENT_CHANGE_WINDOW_HOURS} часа до начала.`}
      </p>
      <SubmitButton className="w-full sm:w-auto">Записать</SubmitButton>
    </ActionForm>
  );
}
