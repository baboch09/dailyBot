import prisma from './prisma'

/**
 * Получает текущий день (начало дня в UTC)
 */
export function getCurrentPeriod(): Date {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return today
}

/**
 * Получает следующий день
 */
export function getNextPeriod(currentPeriod: Date): Date {
  const next = new Date(currentPeriod)
  next.setUTCDate(next.getUTCDate() + 1)
  return next
}

/**
 * Получает предыдущий день
 */
export function getPreviousPeriod(currentPeriod: Date): Date {
  return new Date(currentPeriod.getTime() - 24 * 60 * 60 * 1000)
}

/**
 * Вычисляет streak (дней подряд) для привычки
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

  const today = getCurrentPeriod()

  // Нормализуем даты логов к началу дня
  const normalizedLogs = logs.map(log => {
    const logDate = new Date(log.date)
    logDate.setUTCHours(0, 0, 0, 0)
    logDate.setUTCMinutes(0, 0, 0)
    logDate.setUTCSeconds(0, 0)
    logDate.setUTCMilliseconds(0)
    return logDate
  })

  // Проверяем, выполнена ли привычка в текущем периоде
  const todayLog = normalizedLogs.find(logDate => logDate.getTime() === today.getTime())
  console.log(`🔍 Streak calculation for habit ${habitId}:`, {
    totalLogs: logs.length,
    normalizedLogsCount: normalizedLogs.length,
    todayPeriod: today.toISOString(),
    hasTodayLog: !!todayLog,
    firstLogDate: normalizedLogs[0]?.toISOString(),
    allNormalizedLogs: normalizedLogs.map(l => l.toISOString())
  })

  // Если в текущем периоде не выполнена, начинаем считать с предыдущего периода
  // Важно: today уже нормализован через getCurrentPeriod()
  // Если есть лог для текущего периода, streak начинается с 1, и мы проверяем предыдущий период
  // Если нет лога для текущего периода, streak начинается с 0, и мы проверяем предыдущий период
  let checkDate = getPreviousPeriod(today)
  let streak = todayLog ? 1 : 0
  console.log(`📊 Starting streak calculation:`, { 
    checkDate: checkDate.toISOString(), 
    initialStreak: streak,
    todayLogIndex: todayLog ? normalizedLogs.indexOf(todayLog) : -1,
    hasTodayLog: !!todayLog
  })

  // Идём по логам и считаем последовательные дни
  // Важно: normalizedLogs уже отсортированы по дате (от новых к старым)
  // Если есть лог для текущего дня, начинаем со следующего лога (предыдущий день)
  // Если нет лога для текущего дня, начинаем с первого лога (предыдущий день)
  const startIndex = todayLog ? 1 : 0
  for (let i = startIndex; i < normalizedLogs.length; i++) {
    const logDate = normalizedLogs[i]
    
    // Нормализуем checkDate перед сравнением
    // checkDate уже должен быть нормализован через getPreviousPeriod, но нормализуем снова для уверенности
    const normalizedCheckDate = new Date(checkDate)
    normalizedCheckDate.setUTCHours(0, 0, 0, 0)
    normalizedCheckDate.setUTCMinutes(0, 0, 0)
    normalizedCheckDate.setUTCSeconds(0, 0)
    normalizedCheckDate.setUTCMilliseconds(0)

    // Сравниваем нормализованные даты
    if (logDate.getTime() === normalizedCheckDate.getTime()) {
      streak++
      console.log(`✅ Found consecutive period:`, { 
        logDate: logDate.toISOString(), 
        checkDate: normalizedCheckDate.toISOString(), 
        currentStreak: streak,
        index: i
      })
      checkDate = getPreviousPeriod(normalizedCheckDate)
    } else {
      // Если есть пропуск, прекращаем подсчёт
      console.log(`❌ Streak broken:`, { 
        logDate: logDate.toISOString(), 
        expectedDate: normalizedCheckDate.toISOString(),
        finalStreak: streak,
        index: i
      })
      break
    }
  }

  console.log(`🎯 Final streak for habit ${habitId}: ${streak}`)
  return streak
}

/**
 * Проверяет, выполнена ли привычка сегодня
 */
export async function isCompletedToday(habitId: string): Promise<boolean> {
  const today = getCurrentPeriod()
  const tomorrow = getNextPeriod(today)

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
