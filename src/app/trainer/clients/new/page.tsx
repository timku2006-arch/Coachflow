import { requireTrainer } from "@/server/auth";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { createClientAction } from "@/app/actions/trainer";

export const metadata = { title: "Новый клиент" };

export default async function NewClientPage() {
  await requireTrainer();
  return (
    <>
      <PageHeader title="Новый клиент" subtitle="Клиент войдёт по email и временному паролю, затем задаст свой." />
      <Card className="max-w-lg">
        <ActionForm action={createClientAction}>
          <Field label="Имя и фамилия">
            <Input name="name" required maxLength={100} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required />
          </Field>
          <Field label="Временный пароль" hint="Минимум 8 символов. Передайте его клиенту.">
            <Input name="password" type="text" required minLength={8} autoComplete="off" />
          </Field>
          <Field label="Рост, см">
            <Input name="heightCm" type="number" min={100} max={250} inputMode="numeric" />
          </Field>
          <Field label="Цель">
            <Textarea name="goal" maxLength={500} placeholder="Например: снизить вес на 5 кг" />
          </Field>
          <SubmitButton>Создать клиента</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
