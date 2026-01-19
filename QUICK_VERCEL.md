# ⚡ Быстрый деплой на Vercel (5 минут)

## Шаг 1: Установка Vercel CLI

```bash
npm i -g vercel
```

## Шаг 2: Вход в Vercel

```bash
vercel login
```

## Шаг 3: Первый деплой

```bash
cd /Users/ebabochiev/Desktop/tg
vercel
```

**Ответьте на вопросы:**
- Set up and deploy? **Y**
- Which scope? (выберите ваш аккаунт)
- Link to existing project? **N**
- What's your project's name? **habits-tracker**
- In which directory is your code located? **./**
- Want to override the settings? **N**

## Шаг 4: Настройка базы данных

После первого деплоя:

1. Зайдите на [vercel.com](https://vercel.com)
2. Откройте проект **habits-tracker**
3. **Storage** → **Create Database** → **Postgres**
4. Название: `habits-tracker-db`
5. Выберите регион (ближайший)
6. Создайте

Vercel автоматически создаст переменную `POSTGRES_URL`

## Шаг 5: Настройка переменных окружения

В Vercel Dashboard:

1. **Settings** → **Environment Variables**
2. Добавьте:
   ```
   DATABASE_PROVIDER = postgresql
   FRONTEND_URL = https://habits-tracker-xxxx.vercel.app
   ```
   (FRONTEND_URL скопируйте из Overview после деплоя)

## Шаг 6: Применение миграций

```bash
# Получите переменные окружения
vercel env pull .env.local

# Примените миграции
cd backend
npx prisma migrate deploy
npx prisma generate
```

## Шаг 7: Деплой в продакшен

```bash
vercel --prod
```

## Шаг 8: Обновите Bot

1. Скопируйте URL из Vercel (например: `https://habits-tracker.vercel.app`)
2. Обновите `bot/.env`:
   ```env
   WEBAPP_URL=https://habits-tracker.vercel.app
   ```
3. Обновите в BotFather:
   - `/mybots` → ваш бот
   - Menu Button → URL: `https://habits-tracker.vercel.app`

## Готово! 🎉

Теперь всё работает на Vercel!

**Проверка:**
- Откройте: `https://habits-tracker.vercel.app`
- API: `https://habits-tracker.vercel.app/api/health`
- В Telegram: отправьте `/start` боту

