# Telegram Mini App - Трекер Привычек

Production-ready MVP Telegram Mini App для трекинга привычек.

## 🏗️ Архитектура

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **ORM**: Prisma
- **БД**: SQLite (для локальной разработки) / PostgreSQL (для production)
- **Telegram Bot**: node-telegram-bot-api
- **Telegram WebApp SDK**: @twa-dev/sdk

## 📋 Функциональность

- ✅ Аутентификация по `telegram_id` (без регистрации)
- ✅ CRUD операции для привычек
- ✅ Отметка выполнения привычки за текущий день
- ✅ Подсчёт streak (дней подряд)
- ✅ Статистика за последние 7 дней
- ✅ Минималистичный интерфейс
- ✅ Обработка ошибок

## 🚀 Быстрый старт

### 1. Клонирование и установка зависимостей

```bash
# Установка зависимостей корневого проекта
npm install

# Установка зависимостей для backend
cd backend
npm install

# Установка зависимостей для frontend
cd ../frontend
npm install

# Установка зависимостей для bot
cd ../bot
npm install
```

### 2. Настройка переменных окружения

#### Backend (`backend/.env`)

```env
PORT=5001
FRONTEND_URL=http://localhost:3000

# Для PostgreSQL раскомментируйте и укажите свой URL:
# DATABASE_URL="postgresql://user:password@localhost:5432/habits_tracker"
```

#### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5001/api
```

#### Bot (`bot/.env`)

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
WEBAPP_URL=http://localhost:3000
```

**Как получить Telegram Bot Token:**
1. Напишите [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям и получите токен
4. Вставьте токен в `bot/.env`

### 3. Настройка базы данных

```bash
cd backend

# Генерация Prisma Client
npm run db:generate

# Создание миграций (для SQLite файл создастся автоматически)
npm run db:migrate

# (Опционально) Открыть Prisma Studio для просмотра данных
npm run db:studio
```

### 4. Запуск приложения

#### Вариант 1: Запуск всех сервисов одновременно

```bash
# Из корневой директории
npm run dev
```

#### Вариант 2: Запуск по отдельности

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Bot
cd bot
npm run dev
```

### 5. Настройка Telegram Bot

1. Откройте [@BotFather](https://t.me/botfather)
2. Выберите вашего бота
3. Отправьте команду `/newapp`
4. Следуйте инструкциям:
   - Укажите название приложения
   - Загрузите изображение (опционально)
   - Укажите короткое описание
   - Укажите Web App URL: `http://localhost:3000` (для локальной разработки)

**Для production:**
- Используйте ngrok или другой туннель для локальной разработки
- Или разместите frontend на хостинге (Vercel, Netlify и т.д.)
- Укажите production URL в BotFather

## 📁 Структура проекта

```
tg/
├── backend/              # Backend API
│   ├── src/
│   │   ├── controllers/  # Контроллеры
│   │   ├── middleware/   # Middleware (auth, validation)
│   │   ├── routes/       # Маршруты API
│   │   ├── utils/        # Утилиты (streak calculation)
│   │   └── index.ts      # Точка входа
│   ├── prisma/
│   │   └── schema.prisma # Prisma schema
│   └── package.json
├── frontend/             # Frontend приложение
│   ├── src/
│   │   ├── components/   # React компоненты
│   │   ├── services/     # API сервисы
│   │   ├── types/        # TypeScript типы
│   │   └── App.tsx       # Главный компонент
│   └── package.json
├── bot/                  # Telegram Bot
│   ├── src/
│   │   └── index.ts      # Bot логика
│   └── package.json
└── package.json          # Корневой package.json
```

## 🗄️ Prisma Schema

```prisma
model User {
  id         String   @id @default(cuid())
  telegramId BigInt   @unique
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  habits     Habit[]
}

model Habit {
  id          String    @id @default(cuid())
  userId      String
  name        String
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  user        User      @relation(fields: [userId], references: [id])
  logs        HabitLog[]
}

model HabitLog {
  id        String   @id @default(cuid())
  habitId   String
  date      DateTime @default(now())
  createdAt DateTime @default(now())
  habit     Habit    @relation(fields: [habitId], references: [id])

  @@unique([habitId, date])
}
```

## 🔌 API Endpoints

### Привычки

- `GET /api/habits` - Получить все привычки пользователя
- `POST /api/habits` - Создать новую привычку
- `PUT /api/habits/:id` - Обновить привычку
- `DELETE /api/habits/:id` - Удалить привычку
- `POST /api/habits/:id/complete` - Отметить привычку как выполненную за сегодня
- `GET /api/habits/:id/stats` - Получить статистику за последние 7 дней

### Аутентификация

Все запросы требуют заголовок `x-telegram-id` с ID пользователя из Telegram.

## 📝 Примеры API-запросов

### Создать привычку

```bash
curl -X POST http://localhost:5001/api/habits \
  -H "Content-Type: application/json" \
  -H "x-telegram-id: 123456789" \
  -d '{
    "name": "Пить воду",
    "description": "Выпивать 2 литра воды в день"
  }'
```

### Получить все привычки

```bash
curl http://localhost:5001/api/habits \
  -H "x-telegram-id: 123456789"
```

### Отметить привычку как выполненную

```bash
curl -X POST http://localhost:5001/api/habits/HABIT_ID/complete \
  -H "x-telegram-id: 123456789"
```

### Получить статистику

```bash
curl http://localhost:5001/api/habits/HABIT_ID/stats \
  -H "x-telegram-id: 123456789"
```

## 🔧 Разработка

### Миграции базы данных

```bash
cd backend

# Создать новую миграцию
npx prisma migrate dev --name migration_name

# Применить миграции в production
npx prisma migrate deploy

# Открыть Prisma Studio
npx prisma studio
```

### Сборка для production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Файлы будут в frontend/dist/
```

## 🐛 Отладка

### Проверка работы backend

```bash
curl http://localhost:5001/health
```

Должен вернуть:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Логи

Все сервисы выводят логи в консоль:
- Backend: `🚀 Server is running on http://localhost:5001`
- Bot: `🤖 Telegram Bot is running...`
- Frontend: автоматически откроется в браузере на `http://localhost:3000`

## 📱 Использование

1. Запустите все сервисы (`npm run dev`)
2. Откройте Telegram и найдите вашего бота
3. Отправьте команду `/start`
4. Нажмите кнопку "📱 Открыть трекер"
5. Добавьте свои привычки и начинайте отслеживать!

## 🚀 Деплой

### Backend

Рекомендуемые платформы:
- Heroku
- Railway
- DigitalOcean App Platform
- AWS/Google Cloud/Azure

### Frontend

Рекомендуемые платформы:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

**Важно:** После деплоя обновите `WEBAPP_URL` в боте на production URL.

## 📄 Лицензия

MIT

## 👤 Автор

Создано как production-ready MVP для Telegram Mini App.
