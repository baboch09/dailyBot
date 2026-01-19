# ⚡ Быстрый деплой (Vercel + Railway)

## Шаг 1: Frontend на Vercel (2 минуты)

```bash
# Установите Vercel CLI (если ещё нет)
npm i -g vercel

# Войдите
vercel login

# Деплой frontend
cd frontend
vercel

# Следуйте инструкциям:
# - Настройка проекта? N
# - Link to existing project? N
# - Project name? habits-tracker-frontend
# - Directory? ./
# - Override settings? N

# После деплоя скопируйте URL (например: https://habits-tracker-frontend.vercel.app)
```

## Шаг 2: Backend на Railway (5 минут)

```bash
# Установите Railway CLI
npm i -g @railway/cli

# Войдите
railway login

# Создайте проект
cd backend
railway init

# Добавьте PostgreSQL (опционально, но рекомендуется)
railway add postgresql

# Настройте переменные окружения
railway variables set PORT=5001
railway variables set FRONTEND_URL=https://your-frontend.vercel.app

# Деплой
railway up

# Получите URL
railway domain
# Скопируйте URL (например: https://habits-tracker-backend.railway.app)
```

## Шаг 3: Обновите Frontend

```bash
# В Vercel Dashboard:
# 1. Зайдите на vercel.com
# 2. Выберите проект
# 3. Settings → Environment Variables
# 4. Добавьте: VITE_API_URL = https://your-backend.railway.app/api
# 5. Redeploy
```

## Шаг 4: Обновите базу данных

```bash
# Если используете PostgreSQL на Railway:
cd backend
railway run npx prisma migrate deploy
railway run npx prisma generate
```

## Шаг 5: Обновите Telegram Bot

```bash
# Обновите bot/.env
WEBAPP_URL=https://your-frontend.vercel.app

# Перезапустите bot
cd bot
npm run dev
```

## Шаг 6: Настройте BotFather

1. Откройте [@BotFather](https://t.me/botfather)
2. `/mybots` → ваш бот → Menu Button
3. URL: `https://your-frontend.vercel.app`
4. Готово! ✅

## Готово! 🎉

Теперь ваше приложение работает в продакшене без ngrok!

---

## Проверка работы

1. Откройте: `https://your-frontend.vercel.app`
2. Откройте Telegram, отправьте `/start` боту
3. Нажмите "📱 Открыть трекер"
4. Всё должно работать! ✅

## Если что-то не работает

### Frontend не подключается к Backend
- Проверьте `VITE_API_URL` в Vercel
- Проверьте CORS в backend (должен разрешать ваш Vercel домен)

### Ошибки базы данных
- Убедитесь, что миграции применены: `railway run npx prisma migrate deploy`
- Проверьте `DATABASE_URL` в Railway

### Bot не открывает приложение
- Проверьте URL в BotFather
- Убедитесь, что frontend доступен по HTTPS
