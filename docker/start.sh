#!/bin/sh
# Применяет новые миграции к базе и запускает приложение.
#
# Подключение к БД задаётся либо одной строкой DATABASE_URL,
# либо отдельными полями (удобно в панели хостинга — пароль со спецсимволами
# не нужно кодировать вручную):
#   DB_HOST, DB_PORT (5432), DB_USER, DB_PASSWORD, DB_NAME, DB_SSLMODE (необязательно: require/prefer/disable)
set -e

if [ -z "$DATABASE_URL" ]; then
  if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo "Ошибка: задайте DATABASE_URL или DB_HOST, DB_USER, DB_PASSWORD, DB_NAME" >&2
    exit 1
  fi
  DATABASE_URL=$(node -e '
    const e = process.env, enc = encodeURIComponent;
    const ssl = e.DB_SSLMODE ? `&sslmode=${enc(e.DB_SSLMODE)}` : "";
    console.log(`postgresql://${enc(e.DB_USER)}:${enc(e.DB_PASSWORD || "")}@${e.DB_HOST}:${e.DB_PORT || 5432}/${enc(e.DB_NAME)}?schema=public${ssl}`);
  ')
  export DATABASE_URL
fi

if [ -z "$AUTH_SECRET" ]; then
  echo "Ошибка: не задан AUTH_SECRET (минимум 32 символа)" >&2
  exit 1
fi

prisma migrate deploy --schema ./prisma/schema.prisma
exec node server.js
