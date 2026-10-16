"use client";

import { useRef, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

/** Выход: заодно отвязывает push-подписку этого устройства. */
export function LogoutButton({ className, children }: { className?: string; children?: ReactNode }) {
  const endpoint = useRef<HTMLInputElement>(null);
  return (
    <form
      action={logoutAction}
      onSubmit={async (e) => {
        if (endpoint.current?.value || !("serviceWorker" in navigator)) return;
        e.preventDefault();
        const form = e.currentTarget;
        try {
          const reg = await navigator.serviceWorker.getRegistration("/");
          const sub = await reg?.pushManager.getSubscription();
          if (endpoint.current && sub) endpoint.current.value = sub.endpoint;
        } catch {}
        if (endpoint.current && !endpoint.current.value) endpoint.current.value = "-";
        form.requestSubmit();
      }}
    >
      <input ref={endpoint} type="hidden" name="endpoint" defaultValue="" />
      <button className={className}>
        {children ?? (
          <>
            <LogOut size={18} /> Выйти
          </>
        )}
      </button>
    </form>
  );
}
