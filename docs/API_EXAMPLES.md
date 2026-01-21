# Примеры API-запросов

Все запросы требуют заголовок `x-telegram-id` с ID пользователя из Telegram.

## Получить все привычки

```bash
curl http://localhost:5001/api/habits \
  -H "x-telegram-id: 123456789"
```

**Ответ:**
```json
[
  {
    "id": "clx123...",
    "name": "Пить воду",
    "description": "Выпивать 2 литра воды в день",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "streak": 5,
    "isCompletedToday": true
  }
]
```

## Создать привычку

```bash
curl -X POST http://localhost:5001/api/habits \
  -H "Content-Type: application/json" \
  -H "x-telegram-id: 123456789" \
  -d '{
    "name": "Пить воду",
    "description": "Выпивать 2 литра воды в день"
  }'
```

**Ответ:**
```json
{
  "id": "clx123...",
  "name": "Пить воду",
  "description": "Выпивать 2 литра воды в день",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "streak": 0,
  "isCompletedToday": false
}
```

## Обновить привычку

```bash
curl -X PUT http://localhost:5001/api/habits/HABIT_ID \
  -H "Content-Type: application/json" \
  -H "x-telegram-id: 123456789" \
  -d '{
    "name": "Пить 3 литра воды",
    "description": "Увеличить до 3 литров"
  }'
```

## Удалить привычку

```bash
curl -X DELETE http://localhost:5001/api/habits/HABIT_ID \
  -H "x-telegram-id: 123456789"
```

**Ответ:** `204 No Content`

## Отметить привычку как выполненную за сегодня

```bash
curl -X POST http://localhost:5001/api/habits/HABIT_ID/complete \
  -H "x-telegram-id: 123456789"
```

**Ответ:**
```json
{
  "completed": true,
  "streak": 6
}
```

**При повторном вызове** (если уже отмечена сегодня):
```json
{
  "completed": false,
  "streak": 5
}
```

## Получить статистику за последние 7 дней

```bash
curl http://localhost:5001/api/habits/HABIT_ID/stats \
  -H "x-telegram-id: 123456789"
```

**Ответ:**
```json
{
  "habitId": "clx123...",
  "habitName": "Пить воду",
  "streak": 5,
  "last7Days": [
    {
      "date": "2024-01-01",
      "completed": true
    },
    {
      "date": "2024-01-02",
      "completed": true
    },
    {
      "date": "2024-01-03",
      "completed": false
    },
    {
      "date": "2024-01-04",
      "completed": true
    },
    {
      "date": "2024-01-05",
      "completed": true
    },
    {
      "date": "2024-01-06",
      "completed": true
    },
    {
      "date": "2024-01-07",
      "completed": true
    }
  ]
}
```

## Проверка здоровья сервера

```bash
curl http://localhost:5001/health
```

**Ответ:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
