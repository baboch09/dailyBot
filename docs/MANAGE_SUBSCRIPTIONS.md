# 🔧 Управление подписками вручную

## Обнулить подписки пользователя

### Через Prisma Studio (визуально):
1. Запустите Prisma Studio:
   ```bash
   cd backend && npx prisma studio
   ```
2. Откройте таблицу `User`
3. Найдите нужного пользователя по `telegramId`
4. Обновите поля:
   - `subscriptionType`: `free`
   - `subscriptionStatus`: `expired` или `null`
   - `subscriptionExpiresAt`: `null`
   - `subscriptionStartedAt`: `null`

### Через SQL запрос:
```sql
UPDATE "User" 
SET 
  "subscriptionType" = 'free',
  "subscriptionStatus" = 'expired',
  "subscriptionExpiresAt" = NULL,
  "subscriptionStartedAt" = NULL
WHERE "telegramId" = 'YOUR_TELEGRAM_ID';
```

### Через Prisma Client (программно):
```typescript
await prisma.user.update({
  where: { telegramId: BigInt('YOUR_TELEGRAM_ID') },
  data: {
    subscriptionType: 'free',
    subscriptionStatus: 'expired',
    subscriptionExpiresAt: null,
    subscriptionStartedAt: null
  }
})
```

---

## Дать пользователю Premium подписку

### Через Prisma Studio:
1. Откройте Prisma Studio
2. Найдите пользователя
3. Обновите поля:
   - `subscriptionType`: `premium`
   - `subscriptionStatus`: `active`
   - `subscriptionExpiresAt`: выберите дату в будущем (например, через 30 дней)
   - `subscriptionStartedAt`: текущая дата

### Через SQL запрос:
```sql
UPDATE "User" 
SET 
  "subscriptionType" = 'premium',
  "subscriptionStatus" = 'active',
  "subscriptionExpiresAt" = NOW() + INTERVAL '30 days',
  "subscriptionStartedAt" = NOW()
WHERE "telegramId" = 'YOUR_TELEGRAM_ID';
```

### Через Prisma Client:
```typescript
const now = new Date()
const expiresAt = new Date(now)
expiresAt.setDate(expiresAt.getDate() + 30) // 30 дней

await prisma.user.update({
  where: { telegramId: BigInt('YOUR_TELEGRAM_ID') },
  data: {
    subscriptionType: 'premium',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: expiresAt,
    subscriptionStartedAt: now
  }
})
```

---

## Удалить платежи пользователя

### Через SQL:
```sql
DELETE FROM "Payment" 
WHERE "userId" = (SELECT id FROM "User" WHERE "telegramId" = 'YOUR_TELEGRAM_ID');
```

### Через Prisma Client:
```typescript
const user = await prisma.user.findUnique({
  where: { telegramId: BigInt('YOUR_TELEGRAM_ID') }
})

if (user) {
  await prisma.payment.deleteMany({
    where: { userId: user.id }
  })
}
```

---

## Найти свой telegram_id

1. Откройте приложение через Telegram бота
2. Откройте DevTools (F12) в браузере
3. В консоли выполните:
   ```javascript
   window.Telegram.WebApp.initDataUnsafe.user.id
   ```
4. Или посмотрите в логах бэкенда при запросах к API

