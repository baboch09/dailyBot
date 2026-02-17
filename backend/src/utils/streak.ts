import prisma from './prisma'
import { getStartOfTodayUTC, getStartOfTomorrowUTC, getStartOfPreviousDayUTC, normalizeLogDateToDay } from './timezone'

const DEFAULT_TIMEZONE = 'UTC+3'

/**
 * Вычисляет streak (дней подряд) для привычки.
 * Использует часовой пояс пользователя — день обновляется в полночь по местному времени (например, 00:00 МСК).
 */
export async function calculateStreak(habitId: string, timezone: string = DEFAULT_TIMEZONE): Promise<number> {
  const logs = await prisma.habitLog.findMany({
    where: { habitId },
    orderBy: { date: 'desc' }
  })

  if (logs.length === 0) {
    return 0
  }

  const today = getStartOfTodayUTC(timezone)
  const normalizedLogs = logs.map(log => normalizeLogDateToDay(new Date(log.date), timezone))
  const hasTodayLog = normalizedLogs.some(logDate => logDate.getTime() === today.getTime())

  if (!hasTodayLog) {
    return 0
  }

  let streak = 1
  let checkDate = getStartOfPreviousDayUTC(today, timezone)

  for (let i = 1; i < normalizedLogs.length; i++) {
    const logDate = normalizedLogs[i]
    if (logDate.getTime() === checkDate.getTime()) {
      streak++
      checkDate = getStartOfPreviousDayUTC(checkDate, timezone)
    } else {
      break
    }
  }

  return streak
}

/**
 * Проверяет, выполнена ли привычка сегодня (в часовом поясе пользователя)
 */
export async function isCompletedToday(habitId: string, timezone: string = DEFAULT_TIMEZONE): Promise<boolean> {
  const today = getStartOfTodayUTC(timezone)
  const tomorrow = getStartOfTomorrowUTC(timezone)

  const log = await prisma.habitLog.findFirst({
    where: {
      habitId,
      date: {
        gte: today,
        lt: tomorrow
      }
    }
  })

  return !!log
}
