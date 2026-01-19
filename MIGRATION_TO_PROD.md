# 🔄 Миграция с SQLite на PostgreSQL (для продакшена)

## Шаг 1: Обновите Prisma schema для PostgreSQL

### Вариант A: Использовать готовый schema.production.prisma

```bash
cd backend
cp prisma/schema.production.prisma prisma/schema.prisma
```

### Вариант B: Вручную обновить

Откройте `backend/prisma/schema.prisma` и измените:

```prisma
datasource db {
  provider = "postgresql"  // Было: "sqlite"
  url      = env("DATABASE_URL")  // Было: "file:./dev.db"
}
```

## Шаг 2: Настройте переменные окружения

### В Railway:
```bash
railway variables set DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

Railway автоматически создаст эту переменную при добавлении PostgreSQL.

### В Render:
1. Зайдите в панель управления
2. Settings → Environment
3. Добавьте `DATABASE_URL` из вашего PostgreSQL сервиса

## Шаг 3: Примените миграции

### В Railway:
```bash
railway run npx prisma migrate deploy
railway run npx prisma generate
```

### В Render:
```bash
# В настройках Build Command добавьте:
npx prisma generate && npx prisma migrate deploy && npm run build
```

Или вручную через SSH:
```bash
render ssh
cd backend
npx prisma migrate deploy
npx prisma generate
```

## Шаг 4: Проверьте подключение

```bash
# Локально (если хотите протестировать):
DATABASE_URL="postgresql://..." npx prisma studio

# Или через Railway:
railway run npx prisma studio
```

## Важно

- ✅ SQLite данные не переносятся автоматически
- ✅ Нужно создать новую базу данных PostgreSQL
- ✅ Для переноса данных нужен отдельный скрипт (если нужно)

---

## Перенос данных (опционально)

Если нужно перенести данные из SQLite в PostgreSQL:

```bash
# 1. Экспорт из SQLite
cd backend
npx prisma db pull --schema=prisma/schema.sqlite.prisma
npx prisma db seed  # если есть seed

# 2. Импорт в PostgreSQL
# Напишите скрипт миграции данных
# Или используйте Prisma Migrate
```

Для MVP обычно проще начать с чистой базы данных.
