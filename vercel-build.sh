#!/bin/bash
set -e

# Устанавливаем DATABASE_URL если его нет (для Prisma generate)
# Prisma generate требует валидный URL, но не проверяет подключение
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  export DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
fi

# Используем POSTGRES_URL если есть, иначе DATABASE_URL
if [ -n "$POSTGRES_URL" ]; then
  export DATABASE_URL="$POSTGRES_URL"
fi

echo "Using DATABASE_URL for Prisma generate: ${DATABASE_URL:0:30}..." 

cd backend
npm install
npx prisma generate
npm run build

cd ../frontend
npm install
npm run build
