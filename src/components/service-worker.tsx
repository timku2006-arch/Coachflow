"use client";

import { useEffect } from "react";

/** Регистрирует service worker (только в production, чтобы не мешать разработке). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
