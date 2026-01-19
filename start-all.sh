#!/bin/bash
echo "🚀 Запуск всех сервисов Telegram Mini App"
echo ""

# Backend
echo "📦 Запускаю Backend..."
cd backend && npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

sleep 2

# Frontend
echo "🎨 Запускаю Frontend..."
cd ../frontend && npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

sleep 2

# Bot
echo "🤖 Запускаю Bot..."
cd ../bot && npm run dev > ../logs/bot.log 2>&1 &
BOT_PID=$!
echo "Bot PID: $BOT_PID"

cd ..

mkdir -p logs

echo ""
echo "✅ Все сервисы запущены!"
echo ""
echo "Backend:  http://localhost:5001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Логи:"
echo "  tail -f logs/backend.log"
echo "  tail -f logs/frontend.log"
echo "  tail -f logs/bot.log"
echo ""
echo "Для настройки туннеля запустите:"
echo "  ./setup-tunnel.sh"
echo ""
echo "Для остановки всех процессов:"
echo "  pkill -f 'tsx watch' && pkill -f 'vite'"

