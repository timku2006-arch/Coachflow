import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input } from "@/components/ui";
import { registerTrainerAction } from "@/app/actions/auth";
import { prisma } from "@/server/db";

export const metadata = { title: "Регистрация тренера" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const hasTrainer = (await prisma.trainerProfile.count()) > 0;
  if (hasTrainer)
    return (
      <div className="space-y-4 text-sm text-ink-2">
        <p>Тренер уже зарегистрирован. Клиентов создаёт тренер в своём кабинете.</p>
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Перейти ко входу
        </Link>
      </div>
    );
  return (
    <>
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">Регистрация тренера</h1>
      <p className="mb-4 text-sm text-muted">Клиенты получат доступ от вас — их регистрировать не нужно.</p>
      <ActionForm action={registerTrainerAction}>
        <Field label="Имя">
          <Input name="name" autoComplete="name" required maxLength={100} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Пароль" hint="Минимум 8 символов">
          <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <SubmitButton className="w-full">Создать аккаунт</SubmitButton>
      </ActionForm>
    </>
  );
}
