// Vercel Serverless Function для отправки напоминаний о привычках
// Вызывается по расписанию (cron job) для проверки и отправки напоминаний
import type { VercelRequest, VercelResponse } from '@vercel/node'
import TelegramBot from 'node-telegram-bot-api'
import { PrismaClient } from '@prisma/client'

const token = process.env.TELEGRAM_BOT_TOKEN
const webAppUrl = process.env.WEBAPP_URL || 'https://daily-bot-drab.vercel.app'

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set')
  // В serverless функциях не можем использовать process.exit()
  // Но логируем ошибку и бот не будет работать
}

// Инициализация Prisma Client
let prisma: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    try {
      // Нормализуем DATABASE_URL для pooler (как в backend/src/utils/prisma.ts)
      let databaseUrl = process.env.DATABASE_URL ?? 
                       process.env.POSTGRES_PRISMA_URL ?? 
                       process.env.POSTGRES_URL ??
                       process.env.POSTGRES_URL_NON_POOLING

      if (databaseUrl) {
        try {
          const dbUrl = new URL(databaseUrl)
          // Если используется pooler порт (6543), переключаемся на прямой (5432)
          if (dbUrl.port === '6543') {
            dbUrl.port = '5432'
          }
          // Добавляем параметр для работы с connection pooling
          if (!dbUrl.searchParams.has('pgbouncer')) {
            dbUrl.searchParams.set('pgbouncer', 'true')
          }
          if (!dbUrl.searchParams.has('connect_timeout')) {
            dbUrl.searchParams.set('connect_timeout', '10')
          }
          databaseUrl = dbUrl.toString()
          process.env.DATABASE_URL = databaseUrl
        } catch (e) {
          console.warn('Could not parse DATABASE_URL:', e)
        }
      }

      if (!databaseUrl) {
        throw new Error('DATABASE_URL is not set')
      }

      prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      })
    } catch (error) {
      console.error('Failed to initialize Prisma:', error)
      throw error
    }
  }
  return prisma
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
  if (!bot) {
    console.error('Bot not initialized')
    return
  }

  const prisma = getPrismaClient()
  if (!prisma) {
    console.error('Prisma not initialized')
    return
  }

  const now = new Date()
  const currentHourUTC = now.getUTCHours()
  const currentMinuteUTC = now.getUTCMinutes()
  const currentTimeUTC = `${String(currentHourUTC).padStart(2, '0')}:${String(currentMinuteUTC).padStart(2, '0')}`
  
  console.log(`🕐 Current time (UTC): ${currentTimeUTC}`)
  
  /**
   * Парсит часовой пояс "UTC+3", "UTC-5" и возвращает смещение в часах
   */
  function parseTimezoneOffset(tz: string): number {
    const match = tz.match(/UTC([+-])(\d+)/)
    if (!match) return 3
    const sign = match[1] === '+' ? 1 : -1
    return parseInt(match[2], 10) * sign
  }

  /**
   * Начало "сегодня" в часовом поясе пользователя (как Date в UTC).
   * Совпадает с логикой бэкенда при создании логов — проверка "выполнено сегодня" корректна.
   */
  function getStartOfTodayUTC(tz: string): Date {
    const offsetHours = parseTimezoneOffset(tz)
    const now = new Date()
    const localMs = now.getTime() + offsetHours * 60 * 60 * 1000
    const localDate = new Date(localMs)
    const y = localDate.getUTCFullYear()
    const m = localDate.getUTCMonth()
    const d = localDate.getUTCDate()
    const midnightLocal = Date.UTC(y, m, d) - offsetHours * 60 * 60 * 1000
    return new Date(midnightLocal)
  }

  /**
   * Начало следующего дня в часовом поясе пользователя
   */
  function getStartOfTomorrowUTC(tz: string): Date {
    const today = getStartOfTodayUTC(tz)
    return new Date(today.getTime() + 24 * 60 * 60 * 1000)
  }

  /**
   * Преобразует время из локального часового пояса пользователя в UTC
   * @param localTime Время в формате "HH:MM" в локальном часовом поясе пользователя
   * @param timezone Часовой пояс пользователя (например, "UTC+3", "UTC-5")
   * @returns Время в формате "HH:MM" в UTC
   */
  function convertLocalTimeToUTC(localTime: string, timezone: string): string {
    const [hours, minutes] = localTime.split(':').map(Number)
    
    // Парсим часовой пояс (например, "UTC+3" -> +3, "UTC-5" -> -5)
    const timezoneMatch = timezone.match(/UTC([+-])(\d+)/)
    if (!timezoneMatch) {
      console.warn(`Invalid timezone format: ${timezone}, using UTC+3`)
      return convertLocalTimeToUTC(localTime, "UTC+3")
    }
    
    const sign = timezoneMatch[1] === '+' ? 1 : -1
    const offset = parseInt(timezoneMatch[2]) * sign
    
    // Вычитаем offset, чтобы получить UTC время
    // Если пользователь в UTC+3 и установил 12:30, то в UTC это будет 09:30
    let utcHours = hours - offset
    let utcMinutes = minutes
    
    // Обрабатываем переход через границы дня
    if (utcHours < 0) {
      utcHours += 24
    } else if (utcHours >= 24) {
      utcHours -= 24
    }
    
    return `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`
  }

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

  console.log(`📋 Found ${habits.length} habits with reminders enabled`)

  let sentCount = 0

  for (const habit of habits) {
    const userTimezone = habit.user.timezone || "UTC+3"
    console.log(`🔍 Checking habit: "${habit.name}" - reminderTime: "${habit.reminderTime}" (user timezone: ${userTimezone})`)
    
    // Преобразуем время напоминания из локального времени пользователя в UTC
    const reminderTimeUTC = convertLocalTimeToUTC(habit.reminderTime!, userTimezone)
    console.log(`   Reminder time (local): ${habit.reminderTime}, (UTC): ${reminderTimeUTC}`)
    
    // Проверяем, наступило ли время напоминания
    // Учитываем, что cron проверяет каждые 5 минут, поэтому проверяем в диапазоне ±5 минут
    const [reminderHourUTC, reminderMinuteUTC] = reminderTimeUTC.split(':').map(Number)
    const reminderTimeInMinutesUTC = reminderHourUTC * 60 + reminderMinuteUTC
    const currentTimeInMinutesUTC = currentHourUTC * 60 + currentMinuteUTC
    
    // Проверяем, попадает ли текущее время в диапазон напоминания (±5 минут)
    // Это позволяет срабатывать напоминанию даже если cron немного опоздал
    const timeDifference = Math.abs(currentTimeInMinutesUTC - reminderTimeInMinutesUTC)
    const isWithinReminderWindow = timeDifference <= 5 && currentTimeInMinutesUTC >= reminderTimeInMinutesUTC
    
    console.log(`   Current (UTC): ${currentTimeUTC} (${currentTimeInMinutesUTC} min), Reminder (UTC): ${reminderTimeUTC} (${reminderTimeInMinutesUTC} min), Diff: ${timeDifference} min, Within window: ${isWithinReminderWindow}`)
    
    if (!isWithinReminderWindow) {
      continue
    }

    // Режим «Неделя»: напоминание только в выбранные дни (ISO 1=Пн … 7=Вс)
    const reminderDays = (habit as { reminderDays?: string | null }).reminderDays
    if (reminderDays != null && reminderDays.trim() !== '') {
      const nowInUserTz = new Date(now.getTime() + parseTimezoneOffset(userTimezone) * 60 * 60 * 1000)
      const jsDay = nowInUserTz.getUTCDay() // 0=Вс, 1=Пн, …, 6=Сб
      const isoWeekday = jsDay === 0 ? 7 : jsDay // 1=Пн, …, 7=Вс
      const allowedDays = reminderDays.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 1 && n <= 7)
      if (allowedDays.length > 0 && !allowedDays.includes(isoWeekday)) {
        console.log(`   ⏭️  Skipping - today (ISO ${isoWeekday}) not in reminderDays [${reminderDays}]`)
        continue
      }
    }

    // «Сегодня» считаем по часовому поясу пользователя (как при создании логов в бэкенде)
    const todayStart = getStartOfTodayUTC(userTimezone)
    const tomorrowStart = getStartOfTomorrowUTC(userTimezone)

    // Проверяем, выполнена ли привычка сегодня (в календарном дне пользователя)
    const todayLog = await prisma.habitLog.findFirst({
      where: {
        habitId: habit.id,
        date: {
          gte: todayStart,
          lt: tomorrowStart
        }
      }
    })

    console.log(`   Today log found: ${!!todayLog}`)

    // Если привычка ещё не выполнена - отправляем напоминание
    if (!todayLog) {
      // Проверяем наличие telegramId
      if (!habit.user.telegramId) {
        console.error(`   ❌ User ${habit.user.id} has no telegramId`)
        continue
      }
      
      const chatId = Number(habit.user.telegramId.toString())
      if (isNaN(chatId)) {
        console.error(`   ❌ Invalid telegramId for user ${habit.user.id}: ${habit.user.telegramId}`)
        continue
      }
      
      console.log(`   💌 Sending reminder to chatId: ${chatId}`)
      const sent = await sendReminder(chatId, habit.name)
      if (sent) {
        sentCount++
        console.log(`✅ Sent reminder for habit "${habit.name}" to user ${chatId}`)
      } else {
        console.error(`❌ Failed to send reminder for habit "${habit.name}" to user ${chatId}`)
      }
    } else {
      console.log(`   ⏭️  Skipping reminder - habit already completed today`)
    }
  }

  console.log(`📊 Processed ${habits.length} habits, sent ${sentCount} reminders`)
  console.log(`🕐 Check completed at: ${new Date().toISOString()}`)
  return { processed: habits.length, sent: sentCount, currentTime: currentTimeUTC }
}

// Обработчик для внешнего Cron Job (cron-job.org, EasyCron и т.д.)
// Также можно вызывать вручную для тестирования
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Проверка авторизации от внешнего cron сервиса
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  
  // В продакшене обязательно требуем CRON_SECRET
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (isProduction) {
    if (!cronSecret) {
      console.error('❌ CRON_SECRET is required in production')
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'CRON_SECRET is not configured'
      })
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Provide Authorization: Bearer <CRON_SECRET>'
      })
    }
  } else {
    // В dev окружении предупреждаем, но разрешаем без секрета
    if (!cronSecret) {
      console.warn('⚠️ CRON_SECRET not set - endpoint is publicly accessible in development!')
    } else if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Provide Authorization: Bearer <CRON_SECRET>'
      })
    }
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
    if (prisma) {
      await prisma.$disconnect().catch(console.error)
    }
  }
}
