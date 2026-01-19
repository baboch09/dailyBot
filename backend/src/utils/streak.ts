import prisma from './prisma'

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

  // Получаем текущую дату (без времени)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Проверяем, выполнена ли привычка сегодня
  const todayLog = logs.find(log => {
    const logDate = new Date(log.date)
    logDate.setHours(0, 0, 0, 0)
    return logDate.getTime() === today.getTime()
  })

  // Если сегодня не выполнена, начинаем считать со вчера
  let checkDate = todayLog ? today : new Date(today.getTime() - 24 * 60 * 60 * 1000)
  let streak = todayLog ? 1 : 0

  // Идём по логам и считаем последовательные дни
  for (let i = todayLog ? 1 : 0; i < logs.length; i++) {
    const logDate = new Date(logs[i].date)
    logDate.setHours(0, 0, 0, 0)

    const expectedDate = new Date(checkDate)
    expectedDate.setHours(0, 0, 0, 0)

    if (logDate.getTime() === expectedDate.getTime()) {
      streak++
      checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000)
    } else {
      // Если есть пропуск, прекращаем подсчёт
      break
    }
  }

  return streak
}

/**
 * Проверяет, выполнена ли привычка сегодня
 */
export async function isCompletedToday(habitId: string): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

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
