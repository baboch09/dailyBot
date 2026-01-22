#!/bin/bash
# Скрипт для запуска Prisma Studio с правильной конфигурацией

cd "$(dirname "$0")/.."

# Загружаем переменные окружения
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Проверяем DATABASE_URL
if [ -z "$DATABASE_URL" ] && [ -n "$POSTGRES_PRISMA_URL" ]; then
  export DATABASE_URL="$POSTGRES_PRISMA_URL"
fi

if [ -z "$DATABASE_URL" ] && [ -n "$POSTGRES_URL" ]; then
  # Если используется pooler URL (порт 6543), переключаемся на прямой порт (5432)
  DATABASE_URL_FIXED=$(echo "$POSTGRES_URL" | sed 's/:6543\//:5432\//g' | sed 's/pgbouncer=true//g')
  export DATABASE_URL="$DATABASE_URL_FIXED"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Ошибка: DATABASE_URL не настроен"
  echo ""
  echo "Создайте файл .env в директории backend со следующим содержимым:"
  echo "DATABASE_URL=\"postgresql://user:password@host:5432/database\""
  echo ""
  echo "Или установите переменную окружения:"
  echo "export DATABASE_URL=\"postgresql://user:password@host:5432/database\""
  exit 1
fi

echo "🔗 Подключение к базе данных..."
echo "📊 Запуск Prisma Studio..."
echo ""

# Запускаем Prisma Studio
npx prisma studio
