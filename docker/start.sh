#!/bin/sh
# Применяет новые миграции к базе и запускает приложение.
set -e
prisma migrate deploy --schema ./prisma/schema.prisma
exec node server.js
