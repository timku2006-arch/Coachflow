"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Bell, BellOff, BellRing, Share, SquarePlus, X } from "lucide-react";
import { buttonClass } from "./button-class";
import { removePushSubscriptionAction, savePushSubscriptionAction, sendTestPushAction } from "@/app/actions/notifications";

type State = "loading" | "unsupported" | "ios-install" | "default" | "denied" | "subscribed";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing ?? navigator.serviceWorker.register("/sw.js");
}

function usePush(publicKey: string) {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) {
      setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") return setState("denied");
    const reg = await registration();
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      // Подписка есть на устройстве — убеждаемся, что сервер о ней знает (например, после смены пользователя).
      await savePushSubscriptionAction(sub.toJSON());
      setState("subscribed");
    } else setState("default");
  }, []);

  useEffect(() => {
    refresh().catch(() => setState("unsupported"));
    // Открыли приложение — сбрасываем счётчик на иконке.
    (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {});
  }, [refresh]);

  const enable = useCallback(async () => {
    setError(undefined);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "default");
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub = await Promise.race([
        reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 20_000)),
      ]);
      const res = await savePushSubscriptionAction(sub.toJSON());
      if (res.error) throw new Error(res.error);
      setState("subscribed");
    } catch (e) {
      setError("Не удалось включить уведомления. Попробуйте ещё раз.");
      console.error(e);
    }
  }, [publicKey]);

  const disable = useCallback(async () => {
    const reg = await registration();
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await removePushSubscriptionAction(sub.endpoint);
      await sub.unsubscribe();
    }
    setState("default");
  }, []);

  return { state, error, enable, disable };
}

function IosInstallHint() {
  return (
    <div className="rounded-2xl bg-subtle p-4 text-sm">
      <p className="font-bold">Чтобы получать уведомления на iPhone</p>
      <ol className="mt-2 space-y-1.5 text-ink-2">
        <li className="flex items-center gap-2">
          1. Нажмите <Share size={16} className="text-brand-600" /> «Поделиться» в Safari
        </li>
        <li className="flex items-center gap-2">
          2. Выберите <SquarePlus size={16} className="text-brand-600" /> «На экран Домой»
        </li>
        <li>3. Откройте CoachFlow с экрана Домой и включите уведомления здесь</li>
      </ol>
      <p className="mt-2 text-xs text-muted">Нужна iOS 16.4 или новее.</p>
    </div>
  );
}

/** Полная панель настроек push (страница уведомлений). */
export function PushSetup({ publicKey }: { publicKey: string }) {
  const { state, error, enable, disable } = usePush(publicKey);
  const [pending, start] = useTransition();
  const [testMsg, setTestMsg] = useState<string>();

  return (
    <div className="space-y-3">
      {state === "loading" && <div className="h-12 animate-pulse rounded-2xl bg-subtle" />}
      {state === "ios-install" && <IosInstallHint />}
      {state === "unsupported" && <p className="text-sm text-muted">Этот браузер не поддерживает push-уведомления. Уведомления будут видны в приложении.</p>}
      {state === "denied" && (
        <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
          Уведомления запрещены в настройках. Разрешите их для CoachFlow в настройках телефона (Настройки → Уведомления), затем обновите страницу.
        </p>
      )}
      {state === "default" && (
        <button className={buttonClass("primary") + " w-full sm:w-auto"} disabled={pending} onClick={() => start(enable)}>
          <BellRing size={18} /> Включить уведомления
        </button>
      )}
      {state === "subscribed" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800">
            <Bell size={15} /> Уведомления включены
          </span>
          <button
            className={buttonClass("secondary")}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await sendTestPushAction();
                setTestMsg(r.error ?? r.message);
              })
            }
          >
            Проверить
          </button>
          <button className={buttonClass("ghost")} disabled={pending} onClick={() => start(disable)}>
            <BellOff size={16} /> Выключить
          </button>
        </div>
      )}
      {(error || testMsg) && <p className="animate-rise text-sm text-muted">{error ?? testMsg}</p>}
    </div>
  );
}

/** Компактное приглашение включить уведомления (на главной). Скрыто, если уже включены. */
export function PushPrompt({ publicKey }: { publicKey: string }) {
  const { state, error, enable } = usePush(publicKey);
  const [hidden, setHidden] = useState(true);
  const [pending, start] = useTransition();
  useEffect(() => {
    try {
      setHidden(localStorage.getItem("cf-push-prompt-dismissed") === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden || !["default", "ios-install"].includes(state)) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem("cf-push-prompt-dismissed", "1");
    } catch {}
  };
  return (
    <div className="relative mb-4 animate-rise overflow-hidden rounded-3xl border border-brand-200 bg-brand-50 p-4">
      <button onClick={dismiss} className="absolute right-3 top-3 rounded-lg p-1 text-muted hover:bg-surface" aria-label="Скрыть">
        <X size={16} />
      </button>
      <div className="flex gap-3 pr-6">
        <span className="flex h-10 w-10 shrink-0 animate-pulse-ring items-center justify-center rounded-2xl bg-brand-gradient text-white">
          <BellRing size={19} />
        </span>
        <div className="min-w-0">
          <p className="font-bold">Включите уведомления</p>
          <p className="text-sm text-ink-2">Напоминания о тренировках, переносы, отмены и новые результаты — сразу на телефон.</p>
        </div>
      </div>
      <div className="mt-3">
        {state === "ios-install" ? (
          <IosInstallHint />
        ) : (
          <button className={buttonClass("primary")} disabled={pending} onClick={() => start(enable)}>
            Включить
          </button>
        )}
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
