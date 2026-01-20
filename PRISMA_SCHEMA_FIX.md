# 🔧 Исправление ошибки Prisma Schema

## Проблема

Prisma не поддерживает условные выражения в `provider`. Ошибка:
```
error: Argument "provider" is missing in data source block "db"
```

## Решение

### Для продакшена (Vercel):
- Используется `schema.prisma` с PostgreSQL
- Это файл по умолчанию для деплоя

### Для локальной разработки:
- Используйте `schema.sqlite.prisma` для SQLite
- Или настройте локальный PostgreSQL

## Использование SQLite локально

Если хотите использовать SQLite для локальной разработки:

```bash
cd backend

# Используйте SQLite schema
cp prisma/schema.sqlite.prisma prisma/schema.prisma

# Примените миграции
npx prisma migrate dev --name init

# Сгенерируйте клиент
npx prisma generate
```

## Использование PostgreSQL локально

Если хотите использовать PostgreSQL локально:

1. Установите PostgreSQL или используйте Docker:
   ```bash
   docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
   ```

2. Создайте базу данных:
   ```bash
   createdb habits_tracker
   ```

3. Настройте переменную окружения:
   ```bash
   export DATABASE_URL="postgresql://postgres:password@localhost:5432/habits_tracker"
   ```

4. Используйте основной schema.prisma (PostgreSQL):
   ```bash
   cd backend
   npx prisma migrate dev --name init
   npx prisma generate
   ```

## Для продакшена на Vercel

1. Создайте PostgreSQL в Vercel Dashboard
2. Vercel автоматически создаст `POSTGRES_URL`
3. Schema уже настроен на PostgreSQL
4. Миграции применятся при деплое (после создания БД)

## Переключение между схемами

Если нужно переключиться:

```bash
cd backend/prisma

# Для продакшена (PostgreSQL)
cp schema.prisma schema.backup.prisma 2>/dev/null
# schema.prisma уже PostgreSQL

# Для локальной разработки (SQLite)
cp schema.sqlite.prisma schema.prisma
```

---

**Важно:** В продакшене всегда используйте PostgreSQL schema!
