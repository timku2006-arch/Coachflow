"use client";

import { useEffect } from "react";
import { markAllReadAction } from "@/app/actions/notifications";

/** Отмечает уведомления прочитанными после того, как пользователь открыл ленту. */
export function MarkRead() {
  useEffect(() => {
    const t = setTimeout(() => {
      markAllReadAction().catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, []);
  return null;
}
