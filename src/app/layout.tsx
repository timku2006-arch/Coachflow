import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ServiceWorker } from "@/components/service-worker";
import "@fontsource-variable/onest";
import "@fontsource-variable/unbounded";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CoachFlow", template: "%s · CoachFlow" },
  description: "CoachFlow — прогресс клиентов и запись на тренировки",
  applicationName: "CoachFlow",
  appleWebApp: { capable: true, title: "CoachFlow", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a0d14" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0d14" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
