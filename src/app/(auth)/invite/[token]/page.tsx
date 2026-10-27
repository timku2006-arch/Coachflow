import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input } from "@/components/ui";
import { acceptInviteAction } from "@/app/actions/auth";
import { findInvite } from "@/server/services/invites";

export const metadata = { title: "Приглашение" };

/** Ссылка от тренера: клиент придумывает пароль и сразу попадает в приложение. */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findInvite(token);
  if (!invite) {
    return (
      <>
        <h1 className="mb-2 font-display text-[1.375rem] font-bold">Ссылка не работает</h1>
        <p className="text-[17px] text-ink-2">Она устарела или уже использована. Попросите тренера прислать новую.</p>
        <Link href="/login" className="mt-5 block text-center text-[17px] font-semibold text-mint">
          У меня уже есть пароль — войти
        </Link>
      </>
    );
  }
  const firstName = invite.name.split(" ")[0];
  return (
    <>
      <h1 className="mb-1 font-display text-[1.5rem] font-bold">Здравствуйте, {firstName}!</h1>
      <p className="mb-4 text-[17px] text-ink-2">Придумайте пароль — и всё готово.</p>
      <p className="mb-5 rounded-2xl bg-subtle px-4 py-3 text-[15px]">
        Ваш логин: <span className="font-semibold text-ink">{invite.email}</span>
        <span className="mt-0.5 block text-[13px] text-muted">Запомните его вместе с паролем.</span>
      </p>
      <ActionForm action={acceptInviteAction.bind(null, token)}>
        <Field label="Пароль" hint="Минимум 8 символов">
          <Input name="password" type="password" autoComplete="new-password" required minLength={8} className="text-[17px]" />
        </Field>
        <Field label="Повторите пароль">
          <Input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className="text-[17px]" />
        </Field>
        <SubmitButton className="h-14 w-full text-[17px]">Готово, войти</SubmitButton>
      </ActionForm>
    </>
  );
}
