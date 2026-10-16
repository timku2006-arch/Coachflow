import Link from "next/link";
import { requireClient } from "@/server/auth";
import { getClient } from "@/server/services/clients";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Field, Input, PageHeader, Stat, Textarea } from "@/components/ui";
import { NutritionCard } from "@/components/nutrition-card";
import { updateOwnProfileAction } from "@/app/actions/sessions";
import { fmtKg } from "@/components/results-list";

export const metadata = { title: "Профиль" };

export default async function ClientProfile() {
  const { actor, user } = await requireClient();
  const client = await getClient(actor, actor.clientId);
  const lastWeight = client.bodyWeights.at(-1);
  return (
    <>
      <PageHeader title="Мой профиль" subtitle={`${user.email} · тренер ${client.trainer.user.name}`} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Данные">
          <div className="mb-4">
            <Stat label="Текущий вес" value={lastWeight ? fmtKg(lastWeight.weightKg) : "—"} unit={lastWeight ? "кг" : undefined} />
            <Link href="/client/progress" className="mt-1 inline-block text-xs text-brand-700 hover:underline">Записать вес →</Link>
          </div>
          <ActionForm action={updateOwnProfileAction}>
            <Field label="Имя">
              <Input name="name" defaultValue={user.name} required maxLength={100} />
            </Field>
            <Field label="Рост, см">
              <Input name="heightCm" type="number" min={100} max={250} defaultValue={client.heightCm ?? ""} />
            </Field>
            <Field label="Цель">
              <Textarea name="goal" defaultValue={client.goal ?? ""} maxLength={500} />
            </Field>
            <SubmitButton>Сохранить</SubmitButton>
          </ActionForm>
          <Link href="/change-password" className="mt-4 inline-block text-sm text-muted hover:underline">Сменить пароль</Link>
        </Card>
        <NutritionCard nutrition={client.nutrition} />
      </div>
    </>
  );
}
