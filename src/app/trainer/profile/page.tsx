import Link from "next/link";
import { requireTrainer } from "@/server/auth";
import { telegramLink } from "@/lib/booking-rules";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Field, Input, PageHeader } from "@/components/ui";
import { updateTrainerProfileAction } from "@/app/actions/trainer";

export const metadata = { title: "Профиль" };

export default async function TrainerProfilePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { user } = await requireTrainer();
  const { welcome } = await searchParams;
  const tg = user.trainerProfile?.telegramUsername ?? "";
  return (
    <>
      <PageHeader title="Профиль тренера" subtitle={user.email} />
      {welcome && (
        <p className="mb-4 max-w-lg rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Добро пожаловать в CoachFlow! Укажите Telegram, затем добавьте упражнения и клиентов.
        </p>
      )}
      <Card className="max-w-lg">
        <ActionForm action={updateTrainerProfileAction}>
          <Field label="Имя">
            <Input name="name" defaultValue={user.name} required maxLength={100} />
          </Field>
          <Field label="Telegram username" hint="Без @. Клиенты увидят кнопку «Написать тренеру», если до занятия меньше 3 часов.">
            <Input name="telegramUsername" defaultValue={tg} placeholder="coach_anna" maxLength={64} />
          </Field>
          {tg && (
            <p className="text-xs text-slate-500">
              Ссылка: <a href={telegramLink(tg)!} className="text-brand-700 underline" target="_blank" rel="noopener noreferrer">{telegramLink(tg)}</a>
            </p>
          )}
          <SubmitButton>Сохранить</SubmitButton>
        </ActionForm>
        <Link href="/change-password" className="mt-4 inline-block text-sm text-slate-500 hover:underline">
          Сменить пароль
        </Link>
      </Card>
    </>
  );
}
