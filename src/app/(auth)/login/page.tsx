import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input } from "@/components/ui";
import { loginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { homeFor } from "@/server/session-token";

export const metadata = { title: "Вход" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/change-password" : homeFor(user.role));
  const hasTrainer = (await prisma.trainerProfile.count()) > 0;
  return (
    <>
      <h1 className="mb-4 font-display text-[1.375rem] font-bold">Вход</h1>
      <ActionForm action={loginAction}>
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Пароль">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="w-full">Войти</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-center text-sm text-muted">
        {hasTrainer ? (
          "Нет аккаунта? Попросите тренера создать его для вас."
        ) : (
          <Link href="/register" className="font-semibold text-brand-500 hover:opacity-80">
            Зарегистрироваться как тренер
          </Link>
        )}
      </p>
    </>
  );
}
