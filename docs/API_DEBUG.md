# 🔧 Отладка API на Vercel

## Ваш URL: https://habits-tracker-blush.vercel.app

## Проверка работы API

### 1. Health Check
```bash
curl https://habits-tracker-blush.vercel.app/api/health
```

Должен вернуть:
```json
{"status":"ok","timestamp":"...","environment":"production"}
```

### 2. Проверка переменных окружения

В Vercel Dashboard → Settings → Environment Variables должны быть:

- ✅ `FRONTEND_URL` = `https://habits-tracker-blush.vercel.app`
- ✅ `POSTGRES_URL` = (автоматически после создания PostgreSQL)
- ✅ `DATABASE_URL` = (то же что POSTGRES_URL, или оставить пустым)

### 3. Проверка логов

Vercel Dashboard → Functions → Logs

Ищите ошибки:
- "Cannot find module"
- "Database connection error"
- "Environment variable not found"

---

## Если API не работает

### Проблема: 404 Not Found

**Причина:** Routes не настроены правильно

**Решение:**
1. Проверьте `vercel.json` - routes должны быть:
   ```json
   {
     "routes": [
       { "src": "/api/health", "dest": "api/health.ts" },
       { "src": "/api/(.*)", "dest": "api/index.ts" }
     ]
   }
   ```

### Проблема: 500 Internal Server Error

**Причина:** Ошибка в коде или база данных

**Решение:**
1. Проверьте логи: Functions → Logs
2. Убедитесь, что PostgreSQL создан
3. Проверьте переменные окружения

### Проблема: Frontend показывает "FRONTEND_URL"

**Причина:** Frontend не может подключиться к API

**Решение:**
1. Проверьте, что API работает: `/api/health`
2. Откройте DevTools (F12) → Network
3. Посмотрите, какие запросы падают
4. Проверьте CORS настройки в backend

---

## Проверка после передеплоя

1. **Health endpoint:**
   ```
   https://habits-tracker-blush.vercel.app/api/health
   ```

2. **Frontend:**
   ```
   https://habits-tracker-blush.vercel.app
   ```

3. **В браузере (DevTools):**
   - Откройте Console
   - Проверьте ошибки
   - Откройте Network → посмотрите запросы к `/api/habits`

---

## Быстрая проверка всех endpoints

```bash
# Health
curl https://habits-tracker-blush.vercel.app/api/health

# API (нужен telegram_id в заголовке)
curl https://habits-tracker-blush.vercel.app/api/habits \
  -H "x-telegram-id: 123456789"
```

---

## Если ничего не помогает

1. Проверьте логи в Vercel Dashboard
2. Убедитесь, что все файлы закоммичены и запушены
3. Передеплойте проект
4. Проверьте, что переменные окружения применены ко всем environment (Production, Preview, Development)
