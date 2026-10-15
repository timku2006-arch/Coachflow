# CoachFlow — production-образ (Next.js standalone + миграции Prisma при старте).
# Переменные окружения при запуске: DATABASE_URL, AUTH_SECRET.

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- зависимости
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- сборка (база данных на этом этапе не нужна)
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# --- запуск
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Europe/Moscow
# CLI Prisma — только для применения миграций при старте
RUN npm install -g prisma@6.19.3 && npm cache clean --force
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --chown=app:app docker/start.sh ./start.sh
USER app
EXPOSE 3000
CMD ["sh", "./start.sh"]
