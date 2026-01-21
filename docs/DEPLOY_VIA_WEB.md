# 🌐 Деплой через веб-интерфейс Vercel (без CLI)

Если `npx vercel` не работает, используйте веб-интерфейс!

## Шаг 1: Подготовка кода

### Вариант A: Если есть GitHub репозиторий

1. Создайте репозиторий на GitHub:
   ```bash
   # В корне проекта
   git init
   git add .
   git commit -m "Initial commit"
   # Создайте репозиторий на github.com и выполните:
   git remote add origin https://github.com/YOUR_USERNAME/habits-tracker.git
   git push -u origin main
   ```

### Вариант B: Без GitHub (загрузка через веб)

Код уже готов, можно загрузить через интерфейс Vercel.

## Шаг 2: Деплой через веб-интерфейс

1. **Зайдите на [vercel.com](https://vercel.com)**
   - Войдите в аккаунт (или создайте)

2. **Add New Project**
   - Нажмите кнопку **"Add New..."** → **"Project"**

3. **Import Git Repository** (если есть GitHub)
   - Выберите ваш репозиторий `habits-tracker`
   - Или введите URL: `https://github.com/YOUR_USERNAME/habits-tracker`

4. **Настройка проекта:**

   **Configure Project:**
   - **Project Name:** `habits-tracker` (или любое имя)
   - **Root Directory:** `./` (оставьте пустым или поставьте `.`)
   - **Framework Preset:** `Other`
   - **Build Command:** 
     ```
     cd backend && npm install && npx prisma generate && npm run build && cd ../frontend && npm install && npm run build
     ```
   - **Output Directory:** `frontend/dist`
   - **Install Command:** 
     ```
     cd backend && npm install && cd ../frontend && npm install
     ```

5. **Environment Variables:**
   Пока оставьте пустым, добавим после создания PostgreSQL.

6. **Deploy!**
   - Нажмите **"Deploy"**
   - Дождитесь завершения (2-5 минут)

## Шаг 3: Создание PostgreSQL

После деплоя:

1. В Vercel Dashboard откройте ваш проект
2. Вкладка **Storage** (в верхнем меню)
3. **Create Database** → **Postgres**
4. Настройки:
   - **Name:** `habits-tracker-db`
   - **Region:** выберите ближайший (например, `Frankfurt` или `US East`)
   - **Plan:** Free (для начала)
5. **Create**

Vercel автоматически создаст переменную `POSTGRES_URL`

## Шаг 4: Настройка переменных окружения

1. **Settings** → **Environment Variables**

2. Добавьте переменные:

   **Переменная 1:**
   - **Key:** `DATABASE_PROVIDER`
   - **Value:** `postgresql`
   - **Environment:** ☑ Production ☑ Preview ☑ Development
   - **Add**

   **Переменная 2:**
   - **Key:** `FRONTEND_URL`
   - **Value:** `https://habits-tracker-xxxxx.vercel.app` (ваш URL из Overview)
   - **Environment:** ☑ Production ☑ Preview ☑ Development
   - **Add**

   **Переменная 3 (если нужно):**
   - `POSTGRES_URL` уже должна быть автоматически после создания БД
   - Проверьте, что она есть в списке

## Шаг 5: Применение миграций

### Вариант A: Через Vercel CLI (если получится установить)

```bash
npx vercel env pull .env.local
cd backend
npx prisma migrate deploy
npx prisma generate
```

### Вариант B: Через локальную установку Prisma

```bash
cd backend
npm install
npx prisma migrate deploy --schema=./prisma/schema.prisma
npx prisma generate
```

Но нужно будет добавить `POSTGRES_URL` локально:
```bash
export POSTGRES_URL="ваш_url_из_vercel"
```

### Вариант C: Добавить миграции в Build Command

Обновите Build Command в настройках проекта:

```
cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run build && cd ../frontend && npm install && npm run build
```

Это применит миграции автоматически при каждом деплое.

## Шаг 6: Передеплой

После настройки переменных:

1. В Vercel Dashboard → **Deployments**
2. Нажмите на последний deployment (три точки)
3. **Redeploy** → **Use Existing Build Cache** (или без него)

Или создайте новый коммит и запушьте (если используете GitHub).

## Шаг 7: Обновление Telegram Bot

1. Скопируйте ваш Vercel URL из Overview:
   ```
   https://habits-tracker-xxxxx.vercel.app
   ```

2. Обновите `bot/.env`:
   ```bash
   cd /Users/ebabochiev/Desktop/tg/bot
   echo "WEBAPP_URL=https://habits-tracker-xxxxx.vercel.app" > .env
   echo "TELEGRAM_BOT_TOKEN=8131861834:AAGUawZaUiR1TMd_Gp-2Ob0uX21uYTY5kQo" >> .env
   ```

3. Обновите в BotFather:
   - [@BotFather](https://t.me/botfather)
   - `/mybots` → ваш бот
   - **Bot Settings** → **Menu Button**
   - **URL:** `https://habits-tracker-xxxxx.vercel.app`

## Шаг 8: Проверка

1. **Откройте:** `https://habits-tracker-xxxxx.vercel.app`
2. **API:** `https://habits-tracker-xxxxx.vercel.app/api/health`
3. **В Telegram:** `/start` → "📱 Открыть трекер"

---

## 🔧 Если что-то не работает

### Build не проходит
- Проверьте логи в Vercel Dashboard → Deployments → Logs
- Убедитесь, что все пути правильные

### База данных
- Проверьте, что PostgreSQL создан
- Проверьте переменную `POSTGRES_URL` в Environment Variables

### API 404
- Убедитесь, что `api/index.ts` существует
- Проверьте `vercel.json` конфигурацию

---

**Всё готово!** 🎉
