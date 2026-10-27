"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Send } from "lucide-react";
import { buttonClass } from "./button-class";

/** Ссылка-приглашение: скопировать или сразу отправить клиенту в Telegram. */
export function InviteLink({ token, name, until }: { token: string; name: string; until: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/invite/${token}`;
  const text = `Здравствуйте, ${name.split(" ")[0]}! Это ссылка для входа в приложение для тренировок. Откройте её и придумайте пароль:`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // старые браузеры: выделяем текст, чтобы скопировать вручную
      document.getElementById(`invite-${token}`)?.focus();
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-3">
      <input
        id={`invite-${token}`}
        readOnly
        value={origin ? url : ""}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full truncate rounded-2xl bg-subtle px-4 py-3 font-mono text-[13px] text-ink-2 outline-none focus:ring-2 focus:ring-mint/60"
        aria-label="Ссылка-приглашение"
      />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className={buttonClass("secondary")}>
          {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Скопировано" : "Скопировать"}
        </button>
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="press inline-flex items-center justify-center gap-2 rounded-full bg-[#2aabee] px-4 py-3 text-[15px] font-semibold leading-none text-white hover:brightness-110"
        >
          <Send size={17} /> В Telegram
        </a>
      </div>
      <p className="text-[13px] text-muted">Действует до {until}. Сработает один раз: клиент придумает пароль и сразу войдёт.</p>
    </div>
  );
}
