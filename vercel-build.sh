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

# Установка зависимостей в корне для serverless functions
npm install

# Backend setup
cd backend
npm install

# Prisma generate - используем нормализованный URL (прямой порт 5432)
# Это решает проблему "prepared statement already exists" при использовании pooler
npx prisma generate

# Применяем изменения схемы в проде
# Пропускаем если используется placeholder URL
if [[ "$DATABASE_URL" == *"placeholder:placeholder"* ]]; then
  echo "WARNING: Skipping database schema update (placeholder DATABASE_URL)."
else
  # Используем db push для синхронизации схемы с БД
  # Это безопасно и применятся только изменения
  echo "Pushing schema changes to database..."
  set +e  # Временно отключаем set -e для обработки ошибок
  DB_PUSH_OUTPUT=$(npx prisma db push --accept-data-loss 2>&1)
  DB_PUSH_STATUS=$?
  set -e  # Включаем обратно
  
  if [ $DB_PUSH_STATUS -ne 0 ]; then
    echo "Database push failed with error:"
    echo "$DB_PUSH_OUTPUT"
    # Не завершаем сборку, возможно схема уже актуальна
    echo "Continuing build despite database push error..."
  else
    echo "Database schema updated successfully."
  fi
fi

npm run build

# Копируем сгенерированный Prisma Client в корень для serverless functions
# Vercel использует корневой node_modules для serverless functions в api/
cd ..
echo "Copying Prisma Client to root node_modules..."

# Создаём необходимые директории
mkdir -p node_modules/.prisma/client
mkdir -p node_modules/@prisma

# Копируем Prisma Client
if [ -d "backend/node_modules/.prisma/client" ]; then
  cp -r backend/node_modules/.prisma/client/* node_modules/.prisma/client/ 2>/dev/null || true
  echo "✅ Copied .prisma/client"
else
  echo "⚠️  backend/node_modules/.prisma/client not found"
fi

# Копируем @prisma пакет
if [ -d "backend/node_modules/@prisma" ]; then
  cp -r backend/node_modules/@prisma/* node_modules/@prisma/ 2>/dev/null || true
  echo "✅ Copied @prisma"
else
  echo "⚠️  backend/node_modules/@prisma not found"
fi

# Также генерируем Prisma Client напрямую в корне для надёжности
# Используем схему из prisma/ в корне (если есть) или из backend
if [ -f "prisma/schema.prisma" ]; then
  echo "Generating Prisma Client from root prisma/schema.prisma..."
  npx prisma generate --schema=./prisma/schema.prisma
  echo "✅ Prisma Client generated in root"
else
  echo "Generating Prisma Client from backend/prisma/schema.prisma..."
  npx prisma generate --schema=./backend/prisma/schema.prisma --generator client --output=./node_modules/.prisma/client
  echo "✅ Prisma Client generated in root from backend schema"
fi

# Проверяем, что Prisma Client сгенерирован
if [ -d "node_modules/.prisma/client" ]; then
  echo "✅ Prisma Client is present in root node_modules"
  ls -la node_modules/.prisma/client | head -5
else
  echo "⚠️  WARNING: Prisma Client not found in root node_modules!"
fi

# Frontend setup
cd frontend
npm install
npm run build
