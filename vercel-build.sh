#!/bin/bash
set -e

# Устанавливаем DATABASE_URL если его нет (для Prisma generate)
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  export DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
fi

# Используем POSTGRES_URL если есть, иначе DATABASE_URL
export DATABASE_URL=${POSTGRES_URL:-${DATABASE_URL}}

cd backend
npm install
npx prisma generate
npm run build

cd ../frontend
npm install
npm run build
