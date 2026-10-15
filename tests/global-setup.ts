import { execSync } from "node:child_process";
import { loadEnv } from "vite";

/** Применяет миграции к тестовой БД перед запуском тестов. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? loadEnv("test", process.cwd(), "").TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL не задан (см. .env.example)");
  if (!/test/i.test(url)) throw new Error("TEST_DATABASE_URL должен указывать на отдельную тестовую БД (имя содержит 'test')");
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
