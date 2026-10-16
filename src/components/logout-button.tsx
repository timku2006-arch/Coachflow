"use client";

import { useRef } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

/** Выход: заодно отвязывает push-подписку этого устройства. */
export function LogoutButton() {
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
      <button className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-subtle hover:text-ink active:scale-90" aria-label="Выйти" title="Выйти">
        <LogOut size={18} />
      </button>
    </form>
  );
}
