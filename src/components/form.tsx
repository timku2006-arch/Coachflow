"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import clsx from "clsx";
import type { FormState } from "@/server/action";
import { buttonClass } from "./button-class";

export { buttonClass };

type Action = (state: FormState, fd: FormData) => Promise<FormState>;

/** Форма с server action: показывает ошибку/успех, по желанию очищается после успеха. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
  onState,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  onState?: (state: FormState) => void;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
    if (state.ts) onState?.(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={clsx("space-y-4", className)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <FormMessage state={state} />
    </form>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="animate-pop rounded-2xl bg-coral/12 px-4 py-3 text-[15px] text-coral">
        {state.error}
      </p>
    );
  if (state.ok && state.message)
    return (
      <p role="status" className="animate-pop rounded-xl bg-brand-500/15 px-4 py-3 text-[15px] text-brand-300">
        {state.message}
      </p>
    );
  return null;
}

export function SubmitButton({
  children,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={clsx(buttonClass(variant), className)}>
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          Сохраняю…
        </>
      ) : (
        children
      )}
    </button>
  );
}
