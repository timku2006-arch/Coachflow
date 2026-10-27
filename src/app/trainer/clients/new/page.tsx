import { requireTrainer } from "@/server/auth";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SESSION_DURATION_MIN, SESSION_DURATIONS } from "@/lib/time";
import { createClientAction } from "@/app/actions/trainer";

export const metadata = { title: "Новый клиент" };

export default async function NewClientPage() {
  await requireTrainer();
  return (
    <>
      <PageHeader title="Новый клиент" subtitle="После создания появится ссылка — отправьте её клиенту, он сам придумает пароль." />
      <Card className="max-w-lg">
        <ActionForm action={createClientAction}>
          <Field label="Имя и фамилия">
            <Input name="name" required maxLength={100} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required />
          </Field>
          <details className="rounded-2xl bg-subtle/60 px-4 py-3">
            <summary className="disclosure cursor-pointer text-[14px] font-semibold text-muted">Задать временный пароль вместо ссылки</summary>
            <div className="mt-3">
              <Field label="Временный пароль" hint="Минимум 8 символов. Обычно не нужен: после создания появится ссылка, по которой клиент сам придумает пароль.">
                <Input name="password" type="text" minLength={8} autoComplete="off" />
              </Field>
            </div>
          </details>
          <Field label="Рост, см">
            <Input name="heightCm" type="number" min={100} max={250} inputMode="numeric" />
          </Field>
          <Field label="Цель">
            <Textarea name="goal" maxLength={500} placeholder="Например: снизить вес на 5 кг" />
          </Field>
          <Field label="Длительность тренировки">
            <Select name="sessionDurationMin" defaultValue={SESSION_DURATION_MIN}>
              {SESSION_DURATIONS.map((m) => (
                <option key={m} value={m}>
                  {m} минут
                </option>
              ))}
            </Select>
          </Field>
          <SubmitButton>Создать клиента</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
