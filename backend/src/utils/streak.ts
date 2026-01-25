import prisma from './prisma'

/**
 * ТЕСТОВАЯ ФУНКЦИЯ: Получает текущий "период" для тестирования
 * В тестовом режиме: каждые 5 минут = новый "день"
 * В продакшене: каждый реальный день = новый "день"
 * 
 * TODO: УДАЛИТЬ ПОСЛЕ ТЕСТИРОВАНИЯ - вернуть к реальным дням
 */
export function getCurrentPeriod(): Date {
  // ТЕСТОВЫЙ РЕЖИМ: каждые 5 минут = новый период
  const TEST_MODE = true // TODO: Установить в false после тестирования
  const PERIOD_MINUTES = 5 // Интервал в минутах для тестового режима
  
  if (TEST_MODE) {
    const now = new Date()
    // Округляем до ближайшего 5-минутного интервала
    // Учитываем только минуты и секунды, часы и дата остаются как есть
    const minutes = now.getUTCMinutes()
    const roundedMinutes = Math.floor(minutes / PERIOD_MINUTES) * PERIOD_MINUTES
    const period = new Date(now)
    period.setUTCMinutes(roundedMinutes, 0, 0)
    period.setUTCMilliseconds(0)
    // Сохраняем часы и дату, чтобы каждый 5-минутный интервал был уникальным
    return period
  } else {
    // Продакшен: используем реальный день
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    return today
  }
}

/**
 * ТЕСТОВАЯ ФУНКЦИЯ: Получает следующий период
 * TODO: УДАЛИТЬ ПОСЛЕ ТЕСТИРОВАНИЯ
 */
export function getNextPeriod(currentPeriod: Date): Date {
  const TEST_MODE = true // TODO: Установить в false после тестирования
  const PERIOD_MINUTES = 5
  
  if (TEST_MODE) {
    return new Date(currentPeriod.getTime() + PERIOD_MINUTES * 60 * 1000)
  } else {
    const next = new Date(currentPeriod)
    next.setUTCDate(next.getUTCDate() + 1)
    return next
  }
}

/**
 * ТЕСТОВАЯ ФУНКЦИЯ: Получает предыдущий период
 * TODO: УДАЛИТЬ ПОСЛЕ ТЕСТИРОВАНИЯ
 */
export function getPreviousPeriod(currentPeriod: Date): Date {
  const TEST_MODE = true // TODO: Установить в false после тестирования
  const PERIOD_MINUTES = 5
  
  if (TEST_MODE) {
    return new Date(currentPeriod.getTime() - PERIOD_MINUTES * 60 * 1000)
  } else {
    return new Date(currentPeriod.getTime() - 24 * 60 * 60 * 1000)
  }
}

/**
 * Вычисляет streak (дней подряд) для привычки
 * ТЕСТОВЫЙ РЕЖИМ: использует 5-минутные интервалы вместо дней
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

  // ТЕСТОВЫЙ РЕЖИМ: получаем текущий период (каждые 5 минут) вместо реального дня
  // TODO: УДАЛИТЬ ПОСЛЕ ТЕСТИРОВАНИЯ - вернуть к: const today = new Date(); today.setUTCHours(0, 0, 0, 0)
  const today = getCurrentPeriod()

  // ТЕСТОВЫЙ РЕЖИМ: нормализуем даты логов к текущему периоду (5 минут) вместо дня
  // TODO: УДАЛИТЬ ПОСЛЕ ТЕСТИРОВАНИЯ - вернуть к нормализации по дням
  const TEST_MODE = true
  const PERIOD_MINUTES = 5
  
  const normalizedLogs = logs.map(log => {
    const logDate = new Date(log.date)
    if (TEST_MODE) {
      // Округляем до ближайшего 5-минутного интервала
      // Сохраняем часы и дату, округляем только минуты
      const minutes = logDate.getUTCMinutes()
      const roundedMinutes = Math.floor(minutes / PERIOD_MINUTES) * PERIOD_MINUTES
      logDate.setUTCMinutes(roundedMinutes, 0, 0)
      logDate.setUTCSeconds(0, 0)
      logDate.setUTCMilliseconds(0)
    } else {
      logDate.setUTCHours(0, 0, 0, 0)
      logDate.setUTCMinutes(0, 0, 0)
      logDate.setUTCSeconds(0, 0)
      logDate.setUTCMilliseconds(0)
    }
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

  // Идём по логам и считаем последовательные периоды
  // Важно: normalizedLogs уже отсортированы по дате (от новых к старым)
  // Если есть лог для текущего периода, начинаем со следующего лога (предыдущий период)
  // Если нет лога для текущего периода, начинаем с первого лога (предыдущий период)
  const startIndex = todayLog ? 1 : 0
  for (let i = startIndex; i < normalizedLogs.length; i++) {
    const logDate = normalizedLogs[i]
    
    // Нормализуем checkDate перед сравнением
    // checkDate уже должен быть нормализован через getPreviousPeriod, но нормализуем снова для уверенности
    const normalizedCheckDate = new Date(checkDate)
    if (TEST_MODE) {
      const minutes = normalizedCheckDate.getUTCMinutes()
      const roundedMinutes = Math.floor(minutes / PERIOD_MINUTES) * PERIOD_MINUTES
      normalizedCheckDate.setUTCMinutes(roundedMinutes, 0, 0)
      normalizedCheckDate.setUTCMilliseconds(0)
      normalizedCheckDate.setUTCSeconds(0, 0)
    } else {
      normalizedCheckDate.setUTCHours(0, 0, 0, 0)
      normalizedCheckDate.setUTCMinutes(0, 0, 0)
      normalizedCheckDate.setUTCSeconds(0, 0)
      normalizedCheckDate.setUTCMilliseconds(0)
    }

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
 * Проверяет, выполнена ли привычка в текущем периоде
 * ТЕСТОВЫЙ РЕЖИМ: проверяет текущий 5-минутный интервал вместо дня
 */
export async function isCompletedToday(habitId: string): Promise<boolean> {
  // ТЕСТОВЫЙ РЕЖИМ: используем текущий период (5 минут) вместо дня
  // TODO: УДАЛИТЬ ПОСЛЕ ТЕСТИРОВАНИЯ - вернуть к реальным дням
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
