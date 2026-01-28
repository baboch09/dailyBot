#!/bin/bash

# Скрипт для переключения на production режим
# Использование: ./switch-to-production.sh

echo "🚀 Переключение на PRODUCTION режим..."
echo "⚠️  ВНИМАНИЕ: Реальные платежи!"
echo ""

# Проверяем что файл существует
if [ ! -f "backend/.env.production.ready" ]; then
    echo "❌ Файл backend/.env.production.ready не найден"
    exit 1
fi

# Создаем бэкап текущего .env
if [ -f "backend/.env" ]; then
    echo "📦 Создаю бэкап: backend/.env.backup"
    cp backend/.env backend/.env.backup
fi

# Копируем production конфиг
echo "📝 Копирую production конфигурацию..."
cp backend/.env.production.ready backend/.env

echo ""
echo "✅ ГОТОВО! Production режим активирован"
echo ""
echo "📋 Следующие шаги:"
echo "1. Проверьте DATABASE_URL в backend/.env"
echo "2. Запустите: cd backend && npm run build"
echo "3. Проверьте логи - должно быть '🔒 Production mode'"
echo ""
echo "⚠️  Не забудьте:"
echo "- Настроить webhook в YooKassa"
echo "- Протестировать минимальный платеж"
echo "- Сделать возврат после теста"
echo ""
