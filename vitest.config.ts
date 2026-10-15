import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const env = loadEnv("test", process.cwd(), "");
const testDb = process.env.TEST_DATABASE_URL ?? env.TEST_DATABASE_URL;

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // Интеграционные тесты используют одну тестовую БД — файлы запускаются последовательно.
    fileParallelism: false,
    env: {
      // Сервер может работать в любом поясе — правило не должно от этого зависеть.
      TZ: "America/New_York",
      DATABASE_URL: testDb ?? "",
      TEST_DATABASE_URL: testDb ?? "",
    },
  },
});
