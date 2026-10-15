"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionForm, SubmitButton, buttonClass } from "./form";
import { cancelSessionAction, rescheduleSessionAction } from "@/app/actions/sessions";
import { CLIENT_CHANGE_WINDOW_HOURS } from "@/lib/booking-rules";

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
        <p className="text-xs text-slate-500">Тренер может переносить и отменять занятия в любое время.</p>
      )}
      {mode === "reschedule" ? (
        <ActionForm action={rescheduleSessionAction.bind(null, sessionId)} onState={onState} className="rounded-xl bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Новая дата</span>
              <input name="date" type="date" required defaultValue={defaultDate} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Время (МСК)</span>
              <input name="time" type="time" step={900} required defaultValue={defaultTime} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" />
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
            Перенести
          </button>
          <ActionForm action={cancelSessionAction.bind(null, sessionId)} onState={onState} confirm="Отменить занятие?">
            <SubmitButton variant="danger">Отменить занятие</SubmitButton>
          </ActionForm>
        </div>
      )}
    </div>
  );
}

export function LockedNotice({ telegramUrl }: { telegramUrl: string | null }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">До начала занятия осталось {CLIENT_CHANGE_WINDOW_HOURS} часа или меньше</p>
      <p className="mt-1">Перенести или отменить его самостоятельно уже нельзя. Напишите тренеру — он поможет.</p>
      {telegramUrl ? (
        <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary") + " mt-3 bg-sky-600 hover:bg-sky-700"}>
          ✈️ Написать тренеру в Telegram
        </a>
      ) : (
        <p className="mt-2 text-amber-800">Тренер пока не указал Telegram — свяжитесь с ним удобным способом.</p>
      )}
    </div>
  );
}
