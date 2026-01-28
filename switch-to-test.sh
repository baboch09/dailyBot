#!/bin/bash

# Скрипт для переключения на test режим
# Использование: ./switch-to-test.sh

echo "🧪 Переключение на TEST режим..."
echo ""

# Проверяем что есть env.example
if [ ! -f "backend/env.example" ]; then
    echo "❌ Файл backend/env.example не найден"
    exit 1
fi

# Создаем бэкап текущего .env
if [ -f "backend/.env" ]; then
    echo "📦 Создаю бэкап: backend/.env.backup"
    cp backend/.env backend/.env.backup
fi

# Создаем test конфигурацию
echo "📝 Создаю test конфигурацию..."
cat > backend/.env << 'EOF'
# Backend Environment Variables - TEST MODE
# ============================================

# Server Configuration
NODE_ENV=development
PORT=5001
FRONTEND_URL=http://localhost:3000
WEBAPP_URL=http://localhost:3000

# Database (SQLite для разработки)
DATABASE_URL="file:./prisma/dev.db"

# YooKassa Payment System - TEST MODE
# ============================================
YUKASSA_SHOP_ID=1255129
YUKASSA_SECRET_KEY=test_MN536RM4vAW14xV3teGaeeJJWNwLtGC6mK4dR2BB8Yg
YUKASSA_MODE=test

# Telegram Bot (опционально)
# TELEGRAM_BOT_TOKEN=your_bot_token
# TELEGRAM_WEBAPP_URL=http://localhost:3000
EOF

echo ""
echo "✅ ГОТОВО! Test режим активирован"
echo ""
echo "📋 Следующие шаги:"
echo "1. Запустите: cd backend && npm run build"
echo "2. Проверьте логи - должно быть '🧪 Test mode'"
echo ""
echo "💳 Тестовые карты:"
echo "Успешная: 5555 5555 5555 4444"
echo "Отклонена: 5555 5555 5555 5599"
echo ""
