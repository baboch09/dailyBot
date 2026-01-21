# 🏗️ Архитектура Telegram Mini App - Трекер Привычек

## 📐 Общая схема

```
┌─────────────────┐
│   Telegram Bot  │ ← Отправляет команды /start, показывает кнопку "Открыть трекер"
└────────┬────────┘
         │
         │ Пользователь нажимает кнопку
         ▼
┌─────────────────────────────────────────┐
│     Telegram Mini App (Frontend)        │ ← React приложение в Telegram
│  ┌──────────────────────────────────┐   │
│  │  Отображает интерфейс            │   │
│  │  - Список привычек               │   │
│  │  - Форма добавления              │   │
│  │  - Кнопки отметки выполнения     │   │
│  └──────────────┬───────────────────┘   │
└─────────────────┼───────────────────────┘
                  │
                  │ HTTP запросы (API)
                  │ Заголовок: x-telegram-id
                  ▼
┌─────────────────────────────────────────┐
│         Backend API (Express)           │
│  ┌──────────────────────────────────┐   │
│  │  REST API endpoints              │   │
│  │  /api/habits                     │   │
│  │  - GET    /api/habits            │   │
│  │  - POST   /api/habits            │   │
│  │  - PUT    /api/habits/:id        │   │
│  │  - DELETE /api/habits/:id        │   │
│  │  - POST   /api/habits/:id/complete│  │
│  └──────────────┬───────────────────┘   │
└─────────────────┼───────────────────────┘
                  │
                  │ Prisma ORM
                  ▼
┌─────────────────────────────────────────┐
│      PostgreSQL / SQLite (Database)     │
│  ┌──────────────────────────────────┐   │
│  │  Таблицы:                        │   │
│  │  - users                         │   │
│  │  - habits                        │   │
│  │  - habit_logs                    │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🔄 Как работает аутентификация

### Особенность: Нет логина и пароля!

В Telegram Mini Apps пользователь **уже авторизован** через Telegram.

### Процесс:

1. **Пользователь открывает Mini App в Telegram**
   ```
   Telegram → WebApp SDK → window.Telegram.WebApp
   ```

2. **Frontend получает данные пользователя**
   ```javascript
   // frontend/src/utils/telegram.ts
   const webApp = window.Telegram.WebApp
   const userId = webApp.initDataUnsafe.user.id  // telegram_id
   ```

3. **Frontend отправляет запрос с telegram_id**
   ```javascript
   // frontend/src/services/api.ts
   // Автоматически добавляется заголовок
   headers: {
     'x-telegram-id': '123456789'
   }
   ```

4. **Backend создаёт/находит пользователя**
   ```typescript
   // backend/src/middleware/auth.ts
   const telegramId = req.headers['x-telegram-id']
   let user = await prisma.user.findUnique({
     where: { telegramId: BigInt(telegramId) }
   })
   
   if (!user) {
     user = await prisma.user.create({
       data: { telegramId: BigInt(telegramId) }
     })
   }
   ```

5. **Пользователь привязан к запросам**
   ```typescript
   // backend/src/controllers/habits.controller.ts
   const user = req.user  // Уже получен в middleware
   const habits = await prisma.habit.findMany({
     where: { userId: user.id }
   })
   ```

---

## 📱 Frontend (React + TypeScript)

### Структура:

```
frontend/
├── src/
│   ├── App.tsx              # Главный компонент
│   ├── components/
│   │   ├── HabitItem.tsx    # Компонент одной привычки
│   │   └── AddHabitForm.tsx # Форма добавления
│   ├── services/
│   │   └── api.ts           # Все API запросы
│   ├── utils/
│   │   └── telegram.ts      # Работа с Telegram WebApp SDK
│   └── types/
│       └── index.ts         # TypeScript типы
```

### Как работает:

1. **Инициализация Telegram WebApp**
   ```typescript
   // App.tsx
   useEffect(() => {
     const webApp = window.Telegram.WebApp
     webApp.ready()      // Говорим Telegram, что готовы
     webApp.expand()     // Разворачиваем на весь экран
   }, [])
   ```

2. **Загрузка данных**
   ```typescript
   // App.tsx
   const loadHabits = async () => {
     const data = await habitsApi.getAll()  // GET /api/habits
     setHabits(data)
   }
   ```

3. **Отправка запросов**
   ```typescript
   // services/api.ts
   // Автоматически добавляется telegram_id в заголовки
   api.interceptors.request.use((config) => {
     const telegramId = getTelegramUserId()
     config.headers['x-telegram-id'] = telegramId.toString()
     return config
   })
   ```

4. **Отображение UI**
   - React компоненты рендерят список привычек
   - Tailwind CSS стилизует интерфейс
   - При клике отправляются запросы к API

---

## 🖥️ Backend (Express + TypeScript)

### Структура:

```
backend/
├── src/
│   ├── index.ts              # Точка входа, настройка Express
│   ├── routes/
│   │   └── habits.routes.ts  # Определение маршрутов
│   ├── controllers/
│   │   └── habits.controller.ts  # Бизнес-логика
│   ├── middleware/
│   │   ├── auth.ts           # Аутентификация по telegram_id
│   │   └── validation.ts     # Валидация данных
│   ├── utils/
│   │   ├── prisma.ts         # Prisma Client
│   │   └── streak.ts         # Подсчёт streak (дней подряд)
│   └── types/
│       └── index.ts          # TypeScript типы
```

### Как работает:

1. **Запуск сервера**
   ```typescript
   // index.ts
   const app = express()
   app.use(cors())           // Разрешаем запросы с frontend
   app.use(express.json())   // Парсим JSON
   app.use('/api/habits', habitsRoutes)  // Подключаем роуты
   app.listen(5001)
   ```

2. **Обработка запроса (пример: получение привычек)**
   ```
   Запрос → Express → middleware/auth.ts → routes → controller → database → ответ
   ```

3. **Middleware аутентификации**
   ```typescript
   // middleware/auth.ts
   export async function authenticateUser(req, res, next) {
     const telegramId = req.headers['x-telegram-id']
     
     // Находим или создаём пользователя
     let user = await prisma.user.findUnique({
       where: { telegramId: BigInt(telegramId) }
     })
     
     if (!user) {
       user = await prisma.user.create({ data: { telegramId } })
     }
     
     req.user = user  // Сохраняем в request
     next()           // Передаём дальше
   }
   ```

4. **Controller (бизнес-логика)**
   ```typescript
   // controllers/habits.controller.ts
   export async function getHabits(req, res) {
     const user = req.user  // Уже есть из middleware
     
     // Получаем привычки пользователя
     const habits = await prisma.habit.findMany({
       where: { userId: user.id }
     })
     
     // Добавляем статистику (streak, выполнено ли сегодня)
     const habitsWithStats = await Promise.all(
       habits.map(async (habit) => ({
         ...habit,
         streak: await calculateStreak(habit.id),
         isCompletedToday: await isCompletedToday(habit.id)
       }))
     )
     
     res.json(habitsWithStats)
   }
   ```

5. **Подсчёт streak**
   ```typescript
   // utils/streak.ts
   export async function calculateStreak(habitId: string) {
     // Получаем все отметки, отсортированные по дате
     const logs = await prisma.habitLog.findMany({
       where: { habitId },
       orderBy: { date: 'desc' }
     })
     
     // Считаем последовательные дни
     // Если сегодня выполнена - streak начинается с сегодня
     // Если нет - со вчера
     // Идём назад по дням, пока есть отметки подряд
     
     return streakCount
   }
   ```

---

## 🤖 Telegram Bot

### Структура:

```
bot/
├── src/
│   └── index.ts    # Вся логика бота
```

### Как работает:

1. **Запуск бота**
   ```typescript
   // bot/src/index.ts
   const bot = new TelegramBot(token, { polling: true })
   // polling - бот постоянно спрашивает у Telegram: "Есть новые сообщения?"
   ```

2. **Обработка команды /start**
   ```typescript
   bot.onText(/\/start/, (msg) => {
     const chatId = msg.chat.id
     
     bot.sendMessage(chatId, 'Привет!', {
       reply_markup: {
         inline_keyboard: [[
           {
             text: '📱 Открыть трекер',
             web_app: { url: 'https://your-ngrok-url.ngrok-free.dev' }
           }
         ]]
       }
     })
   })
   ```

3. **Кнопка с WebApp**
   - Когда пользователь нажимает кнопку, Telegram открывает Mini App
   - URL указан в `web_app.url`
   - Telegram автоматически передаёт данные пользователя в WebApp

---

## 🗄️ База данных (Prisma)

### Схема:

```prisma
// prisma/schema.prisma

model User {
  id         String   @id @default(cuid())
  telegramId BigInt   @unique  // Уникальный ID из Telegram
  habits     Habit[]  // Один пользователь → много привычек
}

model Habit {
  id          String    @id @default(cuid())
  userId      String    // Связь с пользователем
  name        String    // "Пить воду"
  description String?   // Опциональное описание
  logs        HabitLog[] // Одна привычка → много отметок
  user        User      @relation(fields: [userId], references: [id])
}

model HabitLog {
  id        String   @id @default(cuid())
  habitId   String   // Связь с привычкой
  date      DateTime // Дата отметки (только день, без времени)
  habit     Habit    @relation(fields: [habitId], references: [id])
  
  @@unique([habitId, date])  // Одна отметка на привычку в день
}
```

### Как работает:

1. **Prisma Client** - сгенерированный клиент для работы с БД
   ```typescript
   import prisma from './utils/prisma'
   
   // Создание
   await prisma.user.create({ data: { telegramId: 123 } })
   
   // Чтение
   const user = await prisma.user.findUnique({
     where: { telegramId: 123 }
   })
   
   // Связи (получить привычки пользователя)
   const userWithHabits = await prisma.user.findUnique({
     where: { telegramId: 123 },
     include: { habits: true }  // Автоматически подтянет связанные привычки
   })
   ```

---

## 🔗 Полный поток данных

### Пример: Пользователь отмечает привычку как выполненную

```
1. Frontend (HabitItem.tsx)
   └─> Пользователь кликает на чекбокс
   └─> Вызывается handleComplete()
   └─> habitsApi.completeToday(habitId)
       └─> POST /api/habits/:id/complete
       └─> Заголовок: x-telegram-id: 123456789

2. Backend (habits.routes.ts)
   └─> Маршрут: router.post('/:id/complete', completeHabitToday)
   └─> Middleware: authenticateUser
       └─> Извлекает telegram_id из заголовка
       └─> Находит/создаёт пользователя
       └─> Сохраняет в req.user

3. Backend (habits.controller.ts)
   └─> completeHabitToday()
   └─> Проверяет, что привычка принадлежит пользователю
   └─> Проверяет, отмечена ли уже сегодня
       ├─> Если да → удаляет отметку (toggle)
       └─> Если нет → создаёт новую отметку
   └─> Подсчитывает новый streak
   └─> Возвращает { completed: true, streak: 5 }

4. Frontend (HabitItem.tsx)
   └─> Получает ответ
   └─> Обновляет состояние (перезагружает список)
   └─> UI обновляется автоматически (React)
```

---

## 🌐 Как работает через ngrok

### Проблема:
- Telegram требует HTTPS для Mini Apps
- Локальный сервер работает на HTTP

### Решение: ngrok туннель

```
┌──────────────────┐
│   Telegram       │
│   (HTTPS)        │
└────────┬─────────┘
         │
         │ https://your-app.ngrok-free.dev
         ▼
┌──────────────────┐
│   Ngrok Tunnel   │ ← Передаёт запросы
│   (HTTPS → HTTP) │
└────────┬─────────┘
         │
         │ http://localhost:3000
         ▼
┌──────────────────┐
│   Frontend       │
│   (Vite Dev)     │
└──────────────────┘
         │
         │ /api → прокси
         ▼
┌──────────────────┐
│   Backend        │
│   :5001          │
└──────────────────┘
```

### Настройки:

1. **Frontend → Backend через прокси**
   ```typescript
   // vite.config.ts
   proxy: {
     '/api': {
       target: 'http://localhost:5001',
       changeOrigin: true
     }
   }
   ```

2. **CORS в Backend**
   ```typescript
   // backend/src/index.ts
   cors({
     origin: [
       'http://localhost:3000',
       'https://your-app.ngrok-free.dev'
     ]
   })
   ```

---

## 🎯 Ключевые концепции

### 1. **Stateless API**
   - Каждый запрос содержит всю нужную информацию (telegram_id)
   - Сервер не хранит сессии
   - Легко масштабировать

### 2. **REST API**
   - GET - получить данные
   - POST - создать
   - PUT - обновить
   - DELETE - удалить
   - Чёткие правила, понятный интерфейс

### 3. **Middleware Pattern**
   ```
   Request → Middleware 1 → Middleware 2 → Handler → Response
   ```
   - Аутентификация - один middleware
   - Валидация - другой middleware
   - Можно переиспользовать

### 4. **Prisma ORM**
   - Типобезопасность
   - Автогенерация кода
   - Миграции базы данных

### 5. **React State Management**
   - Состояние в компонентах
   - При изменении - автоматический ре-рендер
   - Простая модель работы

---

## 🔍 Отладка

### Как проверить, что работает:

1. **Backend**
   ```bash
   curl http://localhost:5001/health
   # Должен вернуть: {"status":"ok",...}
   ```

2. **Frontend**
   ```bash
   curl http://localhost:3000
   # Должен вернуть HTML
   ```

3. **API через прокси**
   ```bash
   curl http://localhost:3000/api/health
   # Должен вернуть ответ от backend
   ```

4. **Telegram Bot**
   - Откройте бота в Telegram
   - Отправьте `/start`
   - Должна появиться кнопка

5. **Ngrok**
   ```bash
   curl http://127.0.0.1:4040/api/tunnels
   # Должен показать активные туннели
   ```

### Логи:

- **Backend**: `/tmp/backend.log` или консоль
- **Frontend**: `/tmp/frontend.log` или консоль
- **Bot**: `/tmp/bot.log` или консоль
- **Ngrok**: `/tmp/ngrok.log`

---

## 📚 Полезные ресурсы

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram WebApp SDK](https://core.telegram.org/bots/webapps)
- [Express.js](https://expressjs.com/)
- [Prisma](https://www.prisma.io/docs)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)

---

## 🚀 Следующие шаги для изучения

1. Попробуйте изменить UI в `frontend/src/components/`
2. Добавьте новый endpoint в `backend/src/controllers/`
3. Измените схему БД в `backend/prisma/schema.prisma` и запустите миграцию
4. Добавьте новую команду бота в `bot/src/index.ts`
5. Изучите логи всех сервисов, чтобы понять поток данных

Удачи! 🎉
