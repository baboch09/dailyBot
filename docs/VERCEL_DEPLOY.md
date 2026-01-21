# 🚀 Деплой всего на Vercel

## Структура деплоя

```
Vercel
├── Frontend (Static Site) → React build
└── Backend (Serverless Functions) → Express API
```

## Шаг 1: Подготовка проекта

Проект уже настроен! Файлы готовы:
- ✅ `vercel.json` - конфигурация Vercel
- ✅ `api/index.ts` - точка входа для serverless functions
- ✅ Backend обновлён для работы на Vercel

## Шаг 2: Настройка базы данных

Vercel предоставляет бесплатную PostgreSQL! Настроим:

### Вариант A: Vercel Postgres (Рекомендуется)

1. В Vercel Dashboard:
   - Откройте ваш проект
   - Storage → Create Database → Postgres
   - Назовите: `habits-tracker-db`
   - Выберите регион (ближайший к вам)

2. Vercel автоматически создаст переменную `POSTGRES_URL`

3. Обновите `backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("POSTGRES_URL")
   }
   ```

### Вариант B: Внешняя PostgreSQL (Railway, Neon, Supabase)

Если хотите использовать внешнюю БД:
1. Создайте PostgreSQL на Railway/Neon/Supabase
2. В Vercel Dashboard → Settings → Environment Variables
3. Добавьте: `DATABASE_URL` = ваш PostgreSQL URL

## Шаг 3: Деплой через Vercel CLI

### Первый деплой:

```bash
# Установите Vercel CLI (если ещё нет)
npm i -g vercel

# Войдите
vercel login

# Деплой (из корня проекта)
cd /Users/ebabochiev/Desktop/tg
vercel

# Следуйте инструкциям:
# - Set up and deploy? Y
# - Which scope? (выберите ваш аккаунт)
# - Link to existing project? N
# - What's your project's name? habits-tracker
# - In which directory is your code located? ./
# - Want to override the settings? N
```

### Деплой в продакшен:

```bash
vercel --prod
```

## Шаг 4: Настройка переменных окружения

После первого деплоя настройте переменные:

### В Vercel Dashboard:

1. Зайдите на vercel.com
2. Выберите проект `habits-tracker`
3. Settings → Environment Variables
4. Добавьте:

**Для Production:**
```
NODE_ENV = production
POSTGRES_URL = (автоматически если используете Vercel Postgres)
FRONTEND_URL = https://your-project.vercel.app
```

**Для Preview/Development:**
```
NODE_ENV = development
POSTGRES_URL = (те же что в Production)
FRONTEND_URL = https://your-project.vercel.app
```

### Если используете внешнюю БД:

Добавьте `DATABASE_URL` вместо `POSTGRES_URL`:
```
DATABASE_URL = postgresql://user:pass@host:5432/dbname
```

## Шаг 5: Миграция базы данных

После настройки переменных, примените миграции:

```bash
# Локально с переменными из Vercel
vercel env pull .env.local

# Или через Vercel CLI
vercel env pull

# Примените миграции
cd backend
npx prisma migrate deploy
npx prisma generate
```

Или используйте Vercel CLI напрямую:

```bash
# Через Vercel CLI (если поддерживается)
vercel run npx prisma migrate deploy
```

**Альтернатива:** Добавьте миграции в build процесс:

Обновите `backend/package.json`:
```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && npm run build"
  }
}
```

## Шаг 6: Обновите Frontend API URL

После деплоя получите URL вашего проекта (например: `https://habits-tracker.vercel.app`)

### Автоматически:

Frontend уже настроен! В `frontend/src/services/api.ts`:
```typescript
const API_URL = window.location.hostname.includes('vercel') 
  ? '/api'  // Использует относительный путь
  : 'http://localhost:5001/api'
```

### Вручную (если нужно):

Добавьте в Vercel Environment Variables:
```
VITE_API_URL = /api
```

Это не обязательно, так как код уже настроен на автоматическое определение.

## Шаг 7: Обновите Telegram Bot

1. Получите URL из Vercel (после деплоя)
   ```
   https://habits-tracker.vercel.app
   ```

2. Обновите `bot/.env`:
   ```env
   WEBAPP_URL=https://habits-tracker.vercel.app
   ```

3. Обновите в BotFather:
   - Откройте [@BotFather](https://t.me/botfather)
   - `/mybots` → ваш бот
   - Menu Button → Configure
   - URL: `https://habits-tracker.vercel.app`

## Шаг 8: Проверка работы

1. **Откройте в браузере:**
   ```
   https://habits-tracker.vercel.app
   ```

2. **Проверьте API:**
   ```
   https://habits-tracker.vercel.app/api/health
   ```
   Должен вернуть: `{"status":"ok",...}`

3. **В Telegram:**
   - Отправьте `/start` боту
   - Нажмите "📱 Открыть трекер"
   - Должно работать! ✅

## 🔧 Настройка CORS

Backend уже настроен на CORS. Убедитесь, что `FRONTEND_URL` в переменных окружения указывает на ваш Vercel домен.

## 📝 Структура проекта для Vercel

```
tg/
├── api/
│   └── index.ts           # Serverless function entry point
├── backend/
│   └── src/
│       └── index.ts       # Express app (экспортируется)
├── frontend/
│   └── ...                # React приложение
└── vercel.json            # Конфигурация Vercel
```

## 🚨 Решение проблем

### Ошибка: "Cannot find module"
- Убедитесь, что все зависимости в `package.json`
- Vercel автоматически установит их при деплое

### Ошибка базы данных
- Проверьте переменную `POSTGRES_URL` или `DATABASE_URL`
- Убедитесь, что миграции применены

### CORS ошибки
- Проверьте `FRONTEND_URL` в переменных окружения
- Убедитесь, что CORS middleware правильно настроен

### API не работает
- Проверьте логи в Vercel Dashboard → Functions
- Убедитесь, что роуты начинаются с `/api/`

## 📊 Мониторинг

В Vercel Dashboard вы можете:
- Видеть логи функций (Functions → Logs)
- Мониторить производительность
- Видеть статистику запросов

## 💰 Стоимость

**Бесплатный tier включает:**
- ✅ 100 GB bandwidth/месяц
- ✅ Unlimited serverless function executions
- ✅ Vercel Postgres (1 GB storage, 60 hours compute/месяц)
- ✅ Более чем достаточно для MVP!

---

Готово! 🎉 Теперь всё работает на Vercel!
