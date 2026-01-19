# 🎯 Что делать прямо сейчас (пошаговая инструкция)

## Шаг 1: Деплой на Vercel (2 минуты)

Выполните в терминале:

```bash
cd /Users/ebabochiev/Desktop/tg
npx vercel
```

**Ответьте на вопросы:**
- Set up and deploy? → **Y**
- Which scope? → (выберите ваш аккаунт)
- Link to existing project? → **N**
- What's your project's name? → **habits-tracker** (или любое имя)
- In which directory is your code located? → **./** (просто точка)
- Want to override the settings? → **N**

После этого Vercel начнёт деплой!

## Шаг 2: Дождитесь деплоя

Вы увидите что-то вроде:
```
✅ Production: https://habits-tracker-xxxxx.vercel.app
```

**Скопируйте этот URL!** Он понадобится дальше.

## Шаг 3: Настройка базы данных (3 минуты)

1. Зайдите на [vercel.com](https://vercel.com)
2. Откройте ваш проект (habits-tracker)
3. Вкладка **Storage** (слева)
4. **Create Database** → **Postgres**
5. Название: `habits-tracker-db`
6. Регион: выберите ближайший
7. **Create**

Vercel автоматически создаст переменную `POSTGRES_URL`

## Шаг 4: Переменные окружения (2 минуты)

В Vercel Dashboard:

1. **Settings** → **Environment Variables**
2. Нажмите **Add New**
3. Добавьте:
   - **Key:** `DATABASE_PROVIDER`
   - **Value:** `postgresql`
   - **Environment:** Production, Preview, Development (все три)
   - **Add**

4. Добавьте ещё одну:
   - **Key:** `FRONTEND_URL`
   - **Value:** `https://habits-tracker-xxxxx.vercel.app` (ваш URL из шага 2)
   - **Environment:** Production, Preview, Development (все три)
   - **Add**

## Шаг 5: Применение миграций (2 минуты)

В терминале:

```bash
cd /Users/ebabochiev/Desktop/tg

# Получить переменные окружения из Vercel
npx vercel env pull .env.local

# Применить миграции
cd backend
npx prisma migrate deploy
npx prisma generate
```

## Шаг 6: Передеплой в продакшен

```bash
cd /Users/ebabochiev/Desktop/tg
npx vercel --prod
```

## Шаг 7: Обновление Telegram Bot (1 минута)

1. Скопируйте ваш Vercel URL (из шага 2)

2. Обновите `bot/.env`:
   ```bash
   cd /Users/ebabochiev/Desktop/tg/bot
   echo "WEBAPP_URL=https://habits-tracker-xxxxx.vercel.app" > .env
   echo "TELEGRAM_BOT_TOKEN=8131861834:AAGUawZaUiR1TMd_Gp-2Ob0uX21uYTY5kQo" >> .env
   ```

3. Обновите в BotFather:
   - Откройте [@BotFather](https://t.me/botfather)
   - Отправьте: `/mybots`
   - Выберите вашего бота
   - **Bot Settings** → **Menu Button** → **Configure Menu Button**
   - **Text:** `Открыть трекер`
   - **URL:** `https://habits-tracker-xxxxx.vercel.app` (ваш URL)
   - **Save**

## Шаг 8: Проверка (1 минута)

1. Откройте в браузере: `https://habits-tracker-xxxxx.vercel.app`
2. Должно показать приложение!

3. Проверьте API:
   - Откройте: `https://habits-tracker-xxxxx.vercel.app/api/health`
   - Должно вернуть: `{"status":"ok",...}`

4. В Telegram:
   - Отправьте `/start` боту
   - Нажмите "📱 Открыть трекер"
   - Приложение должно открыться! 🎉

---

## ⚡ Быстрый чеклист

- [ ] `npx vercel` - деплой
- [ ] Создать PostgreSQL в Vercel Dashboard
- [ ] Добавить переменные окружения
- [ ] Применить миграции (`npx prisma migrate deploy`)
- [ ] `npx vercel --prod` - продакшен
- [ ] Обновить Bot URL в BotFather
- [ ] Протестировать в Telegram

---

## 🆘 Если что-то не работает

### Ошибка деплоя
- Проверьте логи в Vercel Dashboard → Deployments
- Убедитесь, что все файлы на месте

### База данных не работает
- Проверьте переменную `POSTGRES_URL` в Environment Variables
- Убедитесь, что миграции применены

### API не работает
- Проверьте логи: Vercel Dashboard → Functions → Logs
- Убедитесь, что URL правильный

### Bot не открывает приложение
- Проверьте URL в BotFather (должен быть HTTPS)
- Убедитесь, что frontend доступен по URL

---

**Время выполнения: ~15 минут** ⏱️

Начинайте с шага 1! 🚀
