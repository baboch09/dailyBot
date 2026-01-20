# 🚀 Полная настройка Vercel с нуля

Пошаговая инструкция для создания проекта в Vercel с нуля.

---

## ✅ ЧЕКЛИСТ НАСТРОЕК В VERCEL

### 1️⃣ **Настройки проекта (Settings → General)**

#### Framework Preset
- ❌ **НЕ выбирайте** автоматический preset (Vite, React и т.д.)
- ✅ Оставьте **"Other"** или **"No Framework"**

#### Root Directory
- ✅ Оставьте пустым (корень репозитория)

#### Build and Output Settings

```
Install Command:
npm install && cd backend && npm install && cd ../frontend && npm install

Build Command:
./vercel-build.sh

Output Directory:
frontend/dist
```

#### Node.js Version
- ✅ Убедитесь, что выбран **Node.js 18.x** или **20.x**

---

### 2️⃣ **Environment Variables (Settings → Environment Variables)**

**Обязательные переменные:**

#### Для Backend (Production, Preview, Development):
```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

**Как получить DATABASE_URL:**
1. Vercel Postgres:
   - Settings → Storage → Create Database → Postgres
   - После создания автоматически создастся переменная `POSTGRES_URL`
   - Используйте `POSTGRES_URL` как `DATABASE_URL` (или настройте скрипт)

2. Или внешняя PostgreSQL:
   - Используйте любой PostgreSQL провайдер (Railway, Supabase, Neon и т.д.)
   - Формат: `postgresql://user:password@host:5432/database`

#### Для Frontend (Production, Preview, Development):
```env
# НЕ НУЖНЫ - Frontend определяет URL автоматически
```

**Важно:**
- Добавьте переменные для **всех окружений**: Production, Preview, Development
- После добавления **передеплойте проект**

---

### 3️⃣ **Проверка структуры файлов**

Убедитесь, что в корне проекта есть:

```
├── vercel.json          ✅ Конфигурация Vercel
├── vercel-build.sh      ✅ Скрипт сборки (с chmod +x)
├── package.json         ✅ Корневой package.json
├── api/
│   ├── index.ts         ✅ Serverless function для API
│   └── health.ts        ✅ Health check endpoint
├── backend/
│   ├── package.json     ✅
│   ├── tsconfig.json    ✅
│   └── prisma/
│       └── schema.prisma ✅
└── frontend/
    ├── package.json     ✅
    └── dist/            ✅ (создаётся при сборке)
```

**Проверка прав на vercel-build.sh:**
```bash
chmod +x vercel-build.sh
git add vercel-build.sh
git commit -m "Fix: Make vercel-build.sh executable"
git push
```

---

### 4️⃣ **Настройка базы данных**

#### Вариант A: Vercel Postgres (рекомендуется)

1. В Vercel Dashboard:
   - Settings → Storage → Create Database → **Postgres**

2. После создания:
   - Vercel автоматически создаст переменную `POSTGRES_URL`
   - В Environment Variables должна появиться `POSTGRES_URL`

3. Настройка переменной `DATABASE_URL`:
   - Добавьте в Environment Variables:
     ```
     DATABASE_URL = (используйте значение POSTGRES_URL)
     ```
   - Или обновите `vercel-build.sh` чтобы использовать `POSTGRES_URL`:
     ```bash
     if [ -n "$POSTGRES_URL" ]; then
       export DATABASE_URL="$POSTGRES_URL"
     fi
     ```
     (уже есть в скрипте ✅)

4. Применение миграций:
   ```bash
   # Локально после подключения к БД
   cd backend
   npx prisma migrate deploy
   ```

#### Вариант B: Внешняя PostgreSQL

1. Создайте БД на любом провайдере (Railway, Supabase, Neon и т.д.)

2. Скопируйте Connection String

3. Добавьте в Vercel Environment Variables:
   ```
   DATABASE_URL = postgresql://user:password@host:5432/database
   ```

4. Примените миграции:
   ```bash
   # Настройте DATABASE_URL локально
   export DATABASE_URL="your-connection-string"
   
   # Примените миграции
   cd backend
   npx prisma migrate deploy
   ```

---

### 5️⃣ **Применение миграций Prisma**

После настройки `DATABASE_URL` в Vercel:

**Способ 1: Локально (рекомендуется)**

```bash
# 1. Установите DATABASE_URL локально (из Vercel Dashboard)
export DATABASE_URL="postgresql://..." # скопируйте из Vercel

# 2. Перейдите в backend
cd backend

# 3. Примените миграции
npx prisma migrate deploy

# 4. Сгенерируйте Prisma Client
npx prisma generate
```

**Способ 2: Через Vercel CLI**

```bash
# 1. Подключитесь к Vercel
vercel link

# 2. Установите переменные окружения локально
vercel env pull .env.local

# 3. Примените миграции
cd backend
export DATABASE_URL=$(grep DATABASE_URL ../.env.local | cut -d '=' -f2-)
npx prisma migrate deploy
```

---

### 6️⃣ **Настройка Telegram Bot**

#### 1. Получите Bot Token:
   - Напишите [@BotFather](https://t.me/botfather) в Telegram
   - `/newbot` → следуйте инструкциям
   - Скопируйте токен

#### 2. Настройте WebApp URL в BotFather:
   ```
   /newapp
   Выберите вашего бота
   Title: Habits Tracker
   Description: Track your daily habits
   Photo: (опционально)
   Web App URL: https://your-project.vercel.app
   ```

#### 3. Получите WebApp URL из Vercel:
   - После деплоя в Vercel Dashboard найдите домен проекта
   - Обычно: `https://your-project-name.vercel.app`
   - Или настройте кастомный домен

---

### 7️⃣ **Проверка деплоя**

#### Шаг 1: Проверка Health Check
```
https://your-project.vercel.app/api/health
```
**Должен вернуть:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production"
}
```

#### Шаг 2: Проверка API
```
https://your-project.vercel.app/api/habits
```
**С заголовком:**
```
x-telegram-id: 123456789
```
**Должен вернуть:** `[]` (пустой массив) или список привычек

#### Шаг 3: Проверка Frontend
```
https://your-project.vercel.app
```
**Должен открыться** интерфейс приложения

---

### 8️⃣ **Частые проблемы и решения**

#### ❌ Ошибка: "Command './vercel-build.sh' exited with 1"

**Решение:**
```bash
# Убедитесь, что файл исполняемый
chmod +x vercel-build.sh
git add vercel-build.sh
git commit -m "Fix: Make vercel-build.sh executable"
git push
```

#### ❌ Ошибка: "Environment variable not found: DATABASE_URL"

**Решение:**
1. Settings → Environment Variables
2. Добавьте `DATABASE_URL` для всех окружений
3. Передеплойте проект

#### ❌ Ошибка: "Prisma schema validation"

**Решение:**
1. Проверьте `backend/prisma/schema.prisma`
2. Убедитесь, что `provider = "postgresql"`
3. Убедитесь, что `url = env("DATABASE_URL")`

#### ❌ Ошибка: "Cannot connect to database"

**Решение:**
1. Проверьте `DATABASE_URL` в Environment Variables
2. Проверьте, что миграции применены:
   ```bash
   npx prisma migrate deploy
   ```
3. Проверьте доступность БД (firewall, credentials)

#### ❌ Ошибка: "TypeScript compilation failed"

**Решение:**
1. Проверьте ошибки в логах деплоя
2. Убедитесь, что все типы корректны
3. Проверьте `tsconfig.json` в backend и frontend

#### ❌ Frontend не загружается / белый экран

**Решение:**
1. Проверьте консоль браузера (F12)
2. Убедитесь, что API доступен: `/api/health`
3. Проверьте, что приложение открыто через Telegram бота

---

## 📋 ПОЛНЫЙ ЧЕКЛИСТ ПЕРЕД ДЕПЛОЕМ

- [ ] Git репозиторий подключён к Vercel
- [ ] `vercel.json` настроен правильно
- [ ] `vercel-build.sh` исполняемый (chmod +x)
- [ ] `DATABASE_URL` добавлен в Environment Variables
- [ ] База данных создана и доступна
- [ ] Миграции Prisma применены (`npx prisma migrate deploy`)
- [ ] Prisma Client сгенерирован (`npx prisma generate`)
- [ ] Build Command: `./vercel-build.sh`
- [ ] Output Directory: `frontend/dist`
- [ ] Install Command: `npm install && cd backend && npm install && cd ../frontend && npm install`
- [ ] Framework Preset: "Other" или "No Framework"
- [ ] Node.js Version: 18.x или 20.x
- [ ] Telegram Bot создан и настроен
- [ ] WebApp URL добавлен в BotFather
- [ ] Health check работает: `/api/health`
- [ ] Frontend доступен: `/`
- [ ] API работает: `/api/habits`

---

## 🎯 БЫСТРАЯ НАСТРОЙКА (TL;DR)

1. **Создайте проект в Vercel:**
   - Подключите GitHub репозиторий
   - Framework Preset: "Other"

2. **Настройте Build Settings:**
   ```
   Build: ./vercel-build.sh
   Output: frontend/dist
   Install: npm install && cd backend && npm install && cd ../frontend && npm install
   ```

3. **Добавьте Environment Variables:**
   ```
   DATABASE_URL = postgresql://...
   ```

4. **Создайте базу данных:**
   - Vercel Storage → Postgres
   - Используйте `POSTGRES_URL` как `DATABASE_URL`

5. **Примените миграции:**
   ```bash
   export DATABASE_URL="..."
   cd backend
   npx prisma migrate deploy
   ```

6. **Настройте Telegram Bot:**
   - Получите токен от @BotFather
   - Установите WebApp URL: `https://your-project.vercel.app`

7. **Проверьте деплой:**
   - `/api/health` → должен вернуть `{"status":"ok"}`
   - `/` → должен открыться frontend
   - Откройте через Telegram бота

---

## 🔗 Полезные ссылки

- Vercel Dashboard: https://vercel.com/dashboard
- Vercel Storage: https://vercel.com/storage
- Telegram BotFather: https://t.me/botfather
- Prisma Migrate: https://www.prisma.io/docs/concepts/components/prisma-migrate

---

## ✅ После настройки

Ваше приложение должно быть доступно по адресу:
```
https://your-project.vercel.app
```

Откройте через Telegram бота для тестирования!

---

**Нужна помощь?** Проверьте логи деплоя в Vercel Dashboard → Deployments → выберите деплой → View Function Logs
