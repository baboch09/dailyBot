import prisma from './prisma'

/**
 * Нормализует дату к началу дня в UTC
 */
function normalizeToStartOfDay(date: Date): Date {
  const normalized = new Date(date)
  normalized.setUTCHours(0, 0, 0, 0)
  return normalized
}

/**
 * Получает начало следующего дня в UTC
 */
function getNextDay(date: Date): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + 1)
  return next
}

/**
 * Получает начало предыдущего дня в UTC
 */
function getPreviousDay(date: Date): Date {
  const prev = new Date(date)
  prev.setUTCDate(prev.getUTCDate() - 1)
  return prev
}

/**
 * Вычисляет streak (дней подряд) для привычки
 * 
 * Алгоритм:
 * 1. Получаем все логи привычки (отсортированные по дате)
 * 2. Нормализуем даты к началу дня в UTC
 * 3. Проверяем, есть ли лог за сегодня
 * 4. Идем по датам назад и считаем последовательные дни
 * 5. Прерываем подсчет при первом пропущенном дне
 */
export async function calculateStreak(habitId: string): Promise<number> {
  // Получаем все логи привычки, отсортированные по дате (от новых к старым)
  const logs = await prisma.habitLog.findMany({
    where: { habitId },
    orderBy: { date: 'desc' }
  })

  if (logs.length === 0) {
    return 0
  }

  // Получаем текущий день (начало дня в UTC)
  const today = normalizeToStartOfDay(new Date())

  // Нормализуем даты логов к началу дня
  const normalizedLogs = logs.map(log => normalizeToStartOfDay(new Date(log.date)))

  // Проверяем, выполнена ли привычка сегодня
  const hasTodayLog = normalizedLogs.some(logDate => logDate.getTime() === today.getTime())

  // Если нет лога за сегодня, streak = 0
  // Если есть лог за сегодня, начинаем с streak = 1 и проверяем предыдущие дни
  if (!hasTodayLog) {
    return 0
  }

  let streak = 1
  let checkDate = getPreviousDay(today)

  // Идем по логам, начиная со второго (первый - это сегодняшний)
  for (let i = 1; i < normalizedLogs.length; i++) {
    const logDate = normalizedLogs[i]

    if (logDate.getTime() === checkDate.getTime()) {
      // Нашли лог за ожидаемый день - увеличиваем streak
      streak++
      checkDate = getPreviousDay(checkDate)
    } else {
      // Пропущен день - прерываем подсчет
      break
    }
  }

  return streak
}

/**
 * Проверяет, выполнена ли привычка сегодня
 */
export async function isCompletedToday(habitId: string): Promise<boolean> {
  const today = normalizeToStartOfDay(new Date())
  const tomorrow = getNextDay(today)

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
