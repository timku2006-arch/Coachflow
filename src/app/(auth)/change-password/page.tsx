import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input } from "@/components/ui";
import { changePasswordAction } from "@/app/actions/auth";
import { requireUser } from "@/server/auth";
import { homeFor } from "@/server/session-token";
import Link from "next/link";

export const metadata = { title: "Смена пароля" };

export default async function ChangePasswordPage() {
  const user = await requireUser();
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">Смена пароля</h1>
      {user.mustChangePassword && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Пароль был выдан тренером. Придумайте свой, чтобы продолжить.
        </p>
      )}
      <ActionForm action={changePasswordAction}>
        <Field label="Текущий пароль">
          <Input name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="Новый пароль" hint="Минимум 8 символов">
          <Input name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Повторите новый пароль">
          <Input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <SubmitButton className="w-full">Сохранить</SubmitButton>
      </ActionForm>
      {!user.mustChangePassword && (
        <Link href={homeFor(user.role)} className="mt-4 block text-center text-sm text-slate-500 hover:underline">
          Назад
        </Link>
      )}
    </>
  );
}
