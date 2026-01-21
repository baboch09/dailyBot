// Vercel Serverless Function для отправки напоминаний о привычках
// Вызывается по расписанию (cron job) для проверки и отправки напоминаний
import type { VercelRequest, VercelResponse } from '@vercel/node'
import TelegramBot from 'node-telegram-bot-api'
import { PrismaClient } from '@prisma/client'

const token = process.env.TELEGRAM_BOT_TOKEN
const webAppUrl = process.env.WEBAPP_URL || 'https://daily-bot-drab.vercel.app'

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set')
}

// Инициализация Prisma Client
let prisma: PrismaClient
try {
  // Нормализуем DATABASE_URL для pooler
  let databaseUrl = process.env.DATABASE_URL
  if (databaseUrl) {
    try {
      const dbUrl = new URL(databaseUrl)
      if (dbUrl.port === '6543') {
        dbUrl.port = '5432'
      }
      if (!dbUrl.searchParams.has('pgbouncer')) {
        dbUrl.searchParams.set('pgbouncer', 'true')
      }
      databaseUrl = dbUrl.toString()
      process.env.DATABASE_URL = databaseUrl
    } catch (e) {
      console.warn('Could not parse DATABASE_URL:', e)
    }
  }

  prisma = new PrismaClient()
} catch (error) {
  console.error('Failed to initialize Prisma:', error)
  throw error
}

const bot = token ? new TelegramBot(token, { polling: false }) : null

/**
 * Отправка напоминания пользователю
 */
async function sendReminder(chatId: number, habitName: string) {
  if (!bot) return false

  try {
    await bot.sendMessage(
      chatId,
      `⏰ Напоминание!\n\nНе забудьте выполнить привычку: **${habitName}**\n\nСегодня ещё есть время! 💪`,
      {
        parse_mode: 'Markdown',
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
      }
    )
    return true
  } catch (error) {
    console.error('Error sending reminder:', error)
    return false
  }
}

/**
 * Проверка и отправка напоминаний
 */
async function checkAndSendReminders() {
  if (!bot || !prisma) {
    console.error('Bot or Prisma not initialized')
    return
  }

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

  // Получаем все привычки с включёнными напоминаниями
  const habits = await prisma.habit.findMany({
    where: {
      reminderEnabled: true,
      reminderTime: {
        not: null
      }
    },
    include: {
      user: true
    }
  })

  // Получаем сегодняшнюю дату
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  let sentCount = 0

  for (const habit of habits) {
    // Проверяем, наступило ли время напоминания
    if (habit.reminderTime !== currentTime) {
      continue
    }

    // Проверяем, выполнена ли привычка сегодня
    const todayLog = await prisma.habitLog.findFirst({
      where: {
        habitId: habit.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    // Если привычка ещё не выполнена - отправляем напоминание
    if (!todayLog) {
      const chatId = Number(habit.user.telegramId.toString())
      const sent = await sendReminder(chatId, habit.name)
      if (sent) {
        sentCount++
        console.log(`✅ Sent reminder for habit "${habit.name}" to user ${chatId}`)
      }
    }
  }

  console.log(`📊 Processed ${habits.length} habits, sent ${sentCount} reminders`)
  return { processed: habits.length, sent: sentCount }
}

// Обработчик для внешнего Cron Job (cron-job.org, EasyCron и т.д.)
// Также можно вызывать вручную для тестирования
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Проверка авторизации от внешнего cron сервиса
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  
  // Если CRON_SECRET установлен, требуем авторизацию
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized. Provide Authorization: Bearer <CRON_SECRET>' })
    }
  } else {
    // В dev окружении без секрета пропускаем проверку (но лучше установить!)
    console.warn('⚠️ CRON_SECRET not set - endpoint is publicly accessible!')
  }

  try {
    const result = await checkAndSendReminders()
    res.status(200).json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      ...result 
    })
  } catch (error) {
    console.error('Error in reminders cron:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    await prisma?.$disconnect()
  }
}
