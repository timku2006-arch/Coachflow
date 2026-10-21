import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Самодостаточная сборка для Docker (российские хостинги: Timeweb Cloud, Amvera, Yandex Cloud, VPS)
  output: "standalone",
  serverExternalPackages: ["web-push", "sharp"],
};

export default nextConfig;
