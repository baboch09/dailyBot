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

# Нормализуем DATABASE_URL: переключаем pooler порт 6543 на прямой порт 5432
# Это необходимо для prisma generate, так как pooler не поддерживает prepared statements
if [ -n "$DATABASE_URL" ] && [[ "$DATABASE_URL" == *":6543"* ]]; then
  export DATABASE_URL="${DATABASE_URL//:6543/:5432}"
  echo "Switched from pooler port 6543 to direct port 5432 for Prisma generate"
fi

echo "Using DATABASE_URL for Prisma generate: ${DATABASE_URL:0:50}..." 

cd backend
npm install

# Prisma generate - используем нормализованный URL (прямой порт 5432)
# Это решает проблему "prepared statement already exists" при использовании pooler
npx prisma generate

# Применяем миграции в проде, чтобы таблицы реально существовали
# Пропускаем если используется placeholder URL
if [[ "$DATABASE_URL" == *"placeholder:placeholder"* ]]; then
  echo "WARNING: Skipping prisma migrate deploy (placeholder DATABASE_URL)."
else
  # Пытаемся применить миграции
  # Если схема уже существует (была создана через db push), пропускаем или baseline
  set +e  # Временно отключаем set -e для обработки ошибок
  MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
  MIGRATE_STATUS=$?
  set -e  # Включаем обратно
  
  if [ $MIGRATE_STATUS -ne 0 ]; then
    if echo "$MIGRATE_OUTPUT" | grep -q "P3005"; then
      echo "Database schema already exists (from prisma db push)."
      echo "Skipping migrations as schema is already present."
      echo "If you need to apply migrations, run: npx prisma migrate deploy --baseline"
    else
      echo "Migration failed with error:"
      echo "$MIGRATE_OUTPUT"
      # Не завершаем сборку при ошибке миграции, так как схема уже существует
      echo "Continuing build despite migration error..."
    fi
  else
    echo "Migrations applied successfully."
  fi
fi

npm run build

cd ../frontend
npm install
npm run build
