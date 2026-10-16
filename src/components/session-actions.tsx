"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionForm, SubmitButton, buttonClass } from "./form";
import { cancelSessionAction, rescheduleSessionAction } from "@/app/actions/sessions";
import { CLIENT_CHANGE_WINDOW_HOURS } from "@/lib/booking-rules";
import { CalendarClock, Clock3, Send, X } from "lucide-react";
import { inputClass } from "./input-class";

type Props = {
  sessionId: string;
  role: "TRAINER" | "CLIENT";
  /** Вычислено на сервере при рендере; сервер перепроверяет при каждом действии. */
  canChange: boolean;
  telegramUrl: string | null;
  defaultDate: string;
  defaultTime: string;
};

export function SessionActions({ sessionId, role, canChange, telegramUrl, defaultDate, defaultTime }: Props) {
  const [mode, setMode] = useState<"idle" | "reschedule">("idle");
  const [flash, setFlash] = useState<string>();
  const router = useRouter();
  const onState = (s: { error?: string; message?: string }) => {
    if (s.error) {
      // Сервер отказал (например, окно в 3 часа закрылось, пока страница была открыта) — перерисуем карточку.
      setFlash(undefined);
      router.refresh();
      return;
    }
    setFlash(s.message);
    setMode("idle");
  };

  if (role === "CLIENT" && !canChange) return <LockedNotice telegramUrl={telegramUrl} />;

  return (
    <div className="space-y-3">
      {flash && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {flash}
        </p>
      )}
      {role === "TRAINER" && (
        <p className="text-xs text-muted">Тренер может переносить и отменять занятия в любое время.</p>
      )}
      {mode === "reschedule" ? (
        <ActionForm action={rescheduleSessionAction.bind(null, sessionId)} onState={onState} className="animate-rise rounded-2xl bg-subtle p-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-2">Новая дата</span>
              <input name="date" type="date" required defaultValue={defaultDate} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-2">Время (МСК)</span>
              <input name="time" type="time" step={900} required defaultValue={defaultTime} className={inputClass} />
            </label>
          </div>
          <div className="flex gap-2">
            <SubmitButton>Перенести</SubmitButton>
            <button type="button" className={buttonClass("secondary")} onClick={() => setMode("idle")}>
              Отмена
            </button>
          </div>
        </ActionForm>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass("secondary")} onClick={() => setMode("reschedule")}>
            <CalendarClock size={17} /> Перенести
          </button>
          <ActionForm action={cancelSessionAction.bind(null, sessionId)} onState={onState} confirm="Отменить занятие?">
            <SubmitButton variant="danger">
              <X size={17} strokeWidth={2.5} /> Отменить занятие
            </SubmitButton>
          </ActionForm>
        </div>
      )}
    </div>
  );
}

export function LockedNotice({ telegramUrl }: { telegramUrl: string | null }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Clock3 size={20} />
        </span>
        <div>
          <p className="font-bold">До начала осталось {CLIENT_CHANGE_WINDOW_HOURS} часа или меньше</p>
          <p className="mt-0.5 text-amber-800">Перенести или отменить занятие самостоятельно уже нельзя. Напишите тренеру — он поможет.</p>
        </div>
      </div>
      {telegramUrl ? (
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgb(14_165_233_/_0.7)] transition hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] sm:w-auto"
        >
          <Send size={17} /> Написать тренеру в Telegram
        </a>
      ) : (
        <p className="mt-3 text-amber-800">Тренер пока не указал Telegram — свяжитесь с ним удобным способом.</p>
      )}
    </div>
  );
}
