# ⚡ Быстрый справочник

## 🔑 Ваши данные

```
Shop ID:     1255129
Secret Key:  live_XanR4WsL6WeuYg6mOgqPoM2QfcPUt7ntpWHAeGhhc7Y
App URL:     https://daily-bot-drab.vercel.app
Webhook URL: https://daily-bot-drab.vercel.app/api/payments/webhook
```

---

## 🚀 Быстрые команды

### Переключение режимов

```bash
# На production (реальные платежи)
./switch-to-production.sh

# На test (тестовые платежи)
./switch-to-test.sh
```

### Vercel команды

```bash
# Обновить переменные
vercel env add YUKASSA_MODE production
# Введите: production

vercel env add YUKASSA_SECRET_KEY production  
# Введите: live_XanR4WsL6WeuYg6mOgqPoM2QfcPUt7ntpWHAeGhhc7Y

# Проверить переменные
vercel env ls

# Задеплоить
vercel --prod

# Посмотреть логи
vercel logs --follow
```

### Backend команды

```bash
cd backend

# Компиляция
npm run build

# Локальный запуск
npm run dev

# Проверка БД
npx prisma studio
```

---

## 🔗 Важные ссылки

### YooKassa
- Личный кабинет: https://yookassa.ru/my
- Платежи: https://yookassa.ru/my/payments
- Настройки webhook: https://yookassa.ru/my/integration/http-notifications
- API документация: https://yookassa.ru/developers/api

### Vercel
- Проект: https://vercel.com/ebabochievs-projects/daily-bot-drab
- Env variables: https://vercel.com/ebabochievs-projects/daily-bot-drab/settings/environment-variables
- Логи: https://vercel.com/ebabochievs-projects/daily-bot-drab/logs

### Приложение
- Frontend: https://daily-bot-drab.vercel.app
- API Health: https://daily-bot-drab.vercel.app/api/health
- Webhook: https://daily-bot-drab.vercel.app/api/payments/webhook

---

## 💳 Тестовые данные

### Test режим (деньги не списываются)
```
Успешная оплата:
Карта: 5555 5555 5555 4444
Срок: любой будущий (например 12/25)
CVC: любой (например 123)
3D Secure: любой код

Отклоненная оплата:
Карта: 5555 5555 5555 5599
```

### Production режим
⚠️ Используйте реальную карту! Деньги будут списаны!

---

## 📊 Проверка статуса

### Логи что искать:

**Production mode активен:**
```
🔒 Production mode: Using live YooKassa credentials
🚀 PRODUCTION MODE ENABLED - Using live payments!
```

**Webhook работает:**
```
📦 YooKassa webhook received: payment.succeeded
✅ Webhook signature validated successfully
✅ Subscription activated for user
```

**Ошибки:**
```
❌ SECURITY ERROR: Cannot use test credentials
❌ Invalid webhook signature
❌ Payment not found in DB
```

---

## 🆘 Быстрые решения

### Webhook не работает
```bash
# 1. Проверьте URL
curl https://daily-bot-drab.vercel.app/api/health

# 2. Проверьте логи
vercel logs --follow | grep webhook

# 3. Проверьте настройки в YooKassa
# URL: https://daily-bot-drab.vercel.app/api/payments/webhook
# События: payment.succeeded, payment.canceled
```

### Платеж не активирует подписку
```bash
# 1. Найдите ID платежа в YooKassa

# 2. Проверьте статус через API
curl https://daily-bot-drab.vercel.app/api/subscription/check-latest-payment \
  -H "x-telegram-id: YOUR_TELEGRAM_ID"

# 3. Проверьте логи webhook
vercel logs --follow | grep "payment_id"
```

### Нужно вернуться на test режим
```bash
# Быстро переключиться
./switch-to-test.sh

# Или на Vercel
vercel env rm YUKASSA_MODE production
vercel env add YUKASSA_MODE production
# Введите: test

vercel env rm YUKASSA_SECRET_KEY production
vercel env add YUKASSA_SECRET_KEY production
# Введите: test_MN536RM4vAW14xV3teGaeeJJWNwLtGC6mK4dR2BB8Yg

vercel --prod
```

---

## 📱 Контакты

### YooKassa поддержка
- Email: support@yookassa.ru
- Телефон: 8 (800) 250-66-99
- Часы работы: 24/7

### Документация
- YooKassa API: https://yookassa.ru/developers/api
- Vercel Docs: https://vercel.com/docs
- Ваш проект: `/docs/` папка

---

## 📋 Чеклисты

- 📄 **Полный чеклист:** [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)
- 🔗 **Настройка webhook:** [WEBHOOK_SETUP.md](WEBHOOK_SETUP.md)
- 🚀 **Инструкция перехода:** [README_PRODUCTION_SWITCH.md](README_PRODUCTION_SWITCH.md)

---

**Обновлено:** 2026-01-28  
**Режим:** Production Ready ✅
