# ⚡ Быстрый чеклист настройки Vercel

## 🔧 Настройки проекта в Vercel Dashboard

### Settings → General

**Framework Preset:** ❌ Не выбирайте автоматический → Выберите **"Other"**

**Build Command:** `./vercel-build.sh`

**Output Directory:** `frontend/dist`

**Install Command:** `npm install && cd backend && npm install && cd ../frontend && npm install`

---

## 🔐 Environment Variables (Settings → Environment Variables)

### Обязательно добавить:

**Для всех окружений (Production, Preview, Development):**

```
DATABASE_URL = postgresql://user:password@host:5432/database
```

**Как получить:**
1. Vercel Storage → Create Database → Postgres
2. Скопируйте `POSTGRES_URL` → используйте как `DATABASE_URL`
3. Или используйте внешнюю PostgreSQL

---

## 🗄️ База данных

### 1. Создайте БД в Vercel:
   - Storage → Create Database → Postgres

### 2. Примените миграции локально:
   ```bash
   # Установите DATABASE_URL из Vercel
   export DATABASE_URL="postgresql://..."
   
   cd backend
   npx prisma migrate deploy
   ```

---

## 🤖 Telegram Bot

### 1. Получите токен:
   - Напишите @BotFather → `/newbot`

### 2. Настройте WebApp:
   - @BotFather → `/newapp`
   - WebApp URL: `https://your-project.vercel.app`

---

## ✅ Проверка

1. **Health check:** `https://your-project.vercel.app/api/health`
   - Должен вернуть: `{"status":"ok"}`

2. **Frontend:** `https://your-project.vercel.app`
   - Должен открыться интерфейс

3. **Откройте через Telegram бота** для полного теста

---

## ❌ Если что-то не работает

1. **Проверьте логи деплоя** в Vercel Dashboard
2. **Убедитесь, что миграции применены**
3. **Проверьте Environment Variables** (должны быть для всех окружений)
4. **Убедитесь, что vercel-build.sh исполняемый** (должно быть автоматически, но если нет: `chmod +x vercel-build.sh`)

---

**Полная инструкция:** см. `VERCEL_COMPLETE_SETUP.md`
