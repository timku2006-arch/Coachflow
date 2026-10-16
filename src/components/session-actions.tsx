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
        <p role="status" className="animate-pop rounded-xl bg-brand-500/15 px-4 py-3 text-[15px] text-brand-300">
          {flash}
        </p>
      )}
      {role === "TRAINER" && (
        <p className="text-[13px] text-muted">Тренер может переносить и отменять занятия в любое время.</p>
      )}
      {mode === "reschedule" ? (
        <ActionForm action={rescheduleSessionAction.bind(null, sessionId)} onState={onState} className="animate-pop rounded-2xl bg-subtle p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1.5 block text-[13px] font-semibold text-muted">Новая дата</span>
              <input name="date" type="date" required defaultValue={defaultDate} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-[13px] font-semibold text-muted">Время (МСК)</span>
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
    <div className="animate-pop glass rounded-3xl p-4">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Clock3 size={20} />
        </span>
        <div>
          <p className="text-[15px] font-semibold">До начала {CLIENT_CHANGE_WINDOW_HOURS} часа или меньше</p>
          <p className="mt-0.5 text-[14px] text-muted">Перенести или отменить занятие самостоятельно уже нельзя. Напишите тренеру — он поможет.</p>
        </div>
      </div>
      {telegramUrl ? (
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2aabee] px-4 py-3 text-[15px] font-semibold text-white hover:brightness-110"
        >
          <Send size={17} /> Написать тренеру в Telegram
        </a>
      ) : (
        <p className="mt-3 text-[14px] text-muted">Тренер пока не указал Telegram — свяжитесь с ним удобным способом.</p>
      )}
    </div>
  );
}
