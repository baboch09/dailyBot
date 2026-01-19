import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'

dotenv.config()

const token = process.env.TELEGRAM_BOT_TOKEN
const webAppUrl = process.env.WEBAPP_URL || 'http://localhost:3000'

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env file')
  process.exit(1)
}

// Создаём экземпляр бота
const bot = new TelegramBot(token, { polling: true })

console.log('🤖 Telegram Bot is running...')

// Команда /start
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

// Обработка callback queries (для будущих функций)
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

// Готовность к отправке напоминаний (структура для будущих функций)
export async function sendReminder(chatId: number, message: string) {
  try {
    await bot.sendMessage(chatId, message, {
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
  } catch (error) {
    console.error('Error sending reminder:', error)
  }
}

console.log(`✅ Bot initialized. WebApp URL: ${webAppUrl}`)
