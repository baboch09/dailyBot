#!/bin/bash

echo "🌐 Настройка туннеля для Telegram Mini App"
echo ""

# Проверяем, запущен ли frontend
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Frontend не запущен на порту 3000"
    echo "Запустите: cd frontend && npm run dev"
    exit 1
fi

echo "✅ Frontend работает на порту 3000"
echo ""

# Пробуем использовать ngrok, если установлен
if command -v ngrok &> /dev/null; then
    echo "📱 Запускаю ngrok..."
    echo ""
    echo "Если ngrok требует авторизацию:"
    echo "1. Зарегистрируйтесь на https://dashboard.ngrok.com/signup"
    echo "2. Получите authtoken: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "3. Выполните: ngrok config add-authtoken YOUR_TOKEN"
    echo ""
    ngrok http 3000
    exit 0
fi

# Если ngrok в bin/
if [ -f "./bin/ngrok" ]; then
    echo "📱 Запускаю ngrok из bin/..."
    echo ""
    echo "Если ngrok требует авторизацию:"
    echo "1. Зарегистрируйтесь на https://dashboard.ngrok.com/signup"
    echo "2. Получите authtoken: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "3. Выполните: ./bin/ngrok config add-authtoken YOUR_TOKEN"
    echo ""
    ./bin/ngrok http 3000
    exit 0
fi

echo "❌ Ngrok не найден"
echo ""
echo "Варианты установки:"
echo ""
echo "1. Ngrok (рекомендуется):"
echo "   - Зарегистрируйтесь: https://dashboard.ngrok.com/signup"
echo "   - Установите: brew install ngrok/ngrok/ngrok"
echo "   - Или скачайте: https://ngrok.com/download"
echo ""
echo "2. Cloudflare Tunnel (без регистрации для простых случаев):"
echo "   - brew install cloudflare/cloudflare/cloudflared"
echo "   - cloudflared tunnel --url http://localhost:3000"
echo ""
echo "После получения HTTPS URL обновите WebApp URL в BotFather"
