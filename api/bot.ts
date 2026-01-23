// Vercel Serverless Function для Telegram Bot Webhook
import type { VercelRequest, VercelResponse } from '@vercel/node'
import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_BOT_TOKEN
const webAppUrl = process.env.WEBAPP_URL || 'https://daily-bot-drab.vercel.app'

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set')
  // В serverless функциях не можем использовать process.exit()
  // Но логируем ошибку и бот не будет работать
}

// Создаём экземпляр бота без polling (для webhooks)
const bot = token ? new TelegramBot(token, { polling: false }) : null

// Команда /start
if (bot) {
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id
    const firstName = msg.from?.first_name || 'Пользователь'

    bot.sendMessage(chatId, `Привет, ${firstName}! 👋\n\nДобро пожаловать в трекер привычек!`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📱 Открыть трекер',
              web_app: { url: webAppUrl }
            }
          ]
        ]
      }
    })
  })

  // Обработка callback queries
  bot.on('callback_query', (query) => {
    const chatId = query.message?.chat.id
    const data = query.data

    if (data === 'open_tracker') {
      bot.answerCallbackQuery(query.id)
      if (chatId) {
        bot.sendMessage(chatId, 'Открываю трекер...', {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📱 Открыть трекер',
                  web_app: { url: webAppUrl }
                }
              ]
            ]
          }
        })
      }
    }
  })

  // Обработка ошибок
  bot.on('polling_error', (error) => {
    console.error('Polling error:', error)
  })
}

// Обработчик webhook для Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!bot) {
    return res.status(500).json({ error: 'Bot not configured' })
  }

  // Telegram отправляет обновления через POST
  if (req.method === 'POST') {
    const update = req.body

    // Обрабатываем обновление
    bot.processUpdate(update)

    // Сразу отвечаем Telegram, что получили обновление
    res.status(200).json({ ok: true })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
