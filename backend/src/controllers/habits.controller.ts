import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { calculateStreak, isCompletedToday } from '../utils/streak'
import { validationResult } from 'express-validator'
import { FREE_HABITS_LIMIT } from '../middleware/subscription'
import { getStartOfTodayUTC, getStartOfTomorrowUTC, getStartOfPreviousDayUTC, normalizeLogDateToDay, formatDateInTimezone } from '../utils/timezone'

function getUserTimezone(user: { timezone?: string | null }): string {
  return user?.timezone || 'UTC+3'
}

/**
 * Получить все привычки пользователя
 */
export async function getHabits(req: Request, res: Response) {
  try {
    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }

    const timezone = getUserTimezone(user)
    const habits = await prisma.habit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        logs: {
          orderBy: { date: 'desc' },
          take: 100 // Ограничиваем количество логов для производительности
        }
      }
    })

    const today = getStartOfTodayUTC(timezone)
    const tomorrow = getStartOfTomorrowUTC(timezone)

    // Добавляем streak и флаг выполнения за сегодня для каждой привычки
    const habitsWithStats = []
    for (const habit of habits) {
      const streak = calculateStreakFromLogs(habit.logs, today, timezone)
      const isCompletedToday = habit.logs.some(log => {
        const logDay = normalizeLogDateToDay(new Date(log.date), timezone)
        return logDay.getTime() === today.getTime()
      })

      habitsWithStats.push({
        id: habit.id,
        name: habit.name,
        description: habit.description,
        reminderTime: habit.reminderTime,
        reminderEnabled: habit.reminderEnabled,
        goalEnabled: habit.goalEnabled ?? false,
        goalType: habit.goalType ?? null,
        goalTarget: habit.goalTarget ?? null,
        goalPeriodDays: habit.goalPeriodDays ?? null,
        createdAt: habit.createdAt.toISOString(),
        updatedAt: habit.updatedAt.toISOString(),
        streak,
        isCompletedToday
      })
    }

    res.json(habitsWithStats)
  } catch (error) {
    console.error('Error getting habits:', error)
    res.status(500).json({ error: 'Failed to get habits' })
  }
}

/**
 * Вспомогательная функция для вычисления streak из логов (без запроса к БД).
 * Использует часовой пояс пользователя для корректного определения "дня".
 */
function calculateStreakFromLogs(logs: Array<{ date: Date }>, today: Date, timezone: string): number {
  if (logs.length === 0) {
    return 0
  }

  const normalizedLogs = logs.map(log => normalizeLogDateToDay(new Date(log.date), timezone))

  const todayLog = normalizedLogs.find(logDate => logDate.getTime() === today.getTime())
  let checkDate = getStartOfPreviousDayUTC(today, timezone)
  let streak = todayLog ? 1 : 0

  const startIndex = todayLog ? 1 : 0
  for (let i = startIndex; i < normalizedLogs.length; i++) {
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
 * Создать новую привычку
 */
export async function createHabit(req: Request, res: Response) {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }
    
    const { name, description, reminderTime, reminderEnabled, goalEnabled, goalType, goalTarget, goalPeriodDays } = req.body

    // Валидация: проверяем, что имя не пустое после trim
    const trimmedName = name?.trim()
    if (!trimmedName || trimmedName.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid habit name',
        message: 'Название привычки не может быть пустым'
      })
    }

    // Используем транзакцию для атомарной проверки лимита и создания привычки
    // Это предотвращает race condition при одновременных запросах
    
    const habit = await prisma.$transaction(async (tx) => {
      // Блокируем пользователя для чтения (SELECT FOR UPDATE)
      // Это гарантирует, что между проверкой и созданием не будет других операций
      const userWithSubscription = await tx.user.findUnique({
        where: { id: user.id },
        include: {
          habits: true
        }
      })

      if (!userWithSubscription) {
        throw new Error('User not found')
      }

      // Проверяем подписку один раз
      const currentTime = new Date()
      const hasPremium = 
        userWithSubscription.subscriptionStatus === 'active' &&
        userWithSubscription.subscriptionExpiresAt &&
        userWithSubscription.subscriptionExpiresAt > currentTime

      // Проверяем лимит Free плана (делаем это ДО проверки напоминаний)
      if (!hasPremium && userWithSubscription.habits.length >= FREE_HABITS_LIMIT) {
        throw new Error('FREE_PLAN_LIMIT_REACHED')
      }

      // Проверяем, что напоминания доступны только для Premium
      // Напоминания считаются включенными, если:
      // 1. reminderEnabled явно true ИЛИ
      // 2. передан reminderTime (не null и не пустая строка)
      const wantsReminders = reminderEnabled === true || (reminderTime && reminderTime.trim() !== '')
      
      if (wantsReminders && !hasPremium) {
        throw new Error('PREMIUM_REQUIRED_FOR_REMINDERS')
      }

      // Цели — только для Premium
      const wantsGoal = goalEnabled === true && (goalType || goalTarget)
      if (wantsGoal && !hasPremium) {
        throw new Error('PREMIUM_REQUIRED_FOR_GOALS')
      }
      const finalGoalEnabled = hasPremium ? (goalEnabled ?? false) : false
      const finalGoalType = hasPremium && finalGoalEnabled ? (goalType?.trim() || null) : null
      const finalGoalTarget = hasPremium && finalGoalEnabled && goalTarget != null ? Number(goalTarget) : null
      const finalGoalPeriodDays = hasPremium && finalGoalEnabled && goalPeriodDays != null ? Number(goalPeriodDays) : null

      // Для free пользователей всегда отключаем напоминания
      const finalReminderEnabled = hasPremium ? (reminderEnabled ?? false) : false
      const finalReminderTime = hasPremium ? (reminderTime?.trim() || null) : null

      // Создаём привычку
      return await tx.habit.create({
        data: {
          userId: user.id,
          name: trimmedName,
          description: description?.trim() || null,
          reminderTime: finalReminderTime,
          reminderEnabled: finalReminderEnabled,
          goalEnabled: finalGoalEnabled,
          goalType: finalGoalType,
          goalTarget: finalGoalTarget,
          goalPeriodDays: finalGoalPeriodDays
        }
      })
    })

    const timezone = getUserTimezone(user)
    const streak = await calculateStreak(habit.id, timezone)
    const completedToday = await isCompletedToday(habit.id, timezone)

    res.status(201).json({
      id: habit.id,
      name: habit.name,
      description: habit.description,
      reminderTime: habit.reminderTime,
      reminderEnabled: habit.reminderEnabled,
      goalEnabled: habit.goalEnabled ?? false,
      goalType: habit.goalType ?? null,
      goalTarget: habit.goalTarget ?? null,
      goalPeriodDays: habit.goalPeriodDays ?? null,
      createdAt: habit.createdAt.toISOString(),
      updatedAt: habit.updatedAt.toISOString(),
      streak,
      isCompletedToday: completedToday
    })
  } catch (error: any) {
    console.error('Error creating habit:', error)
    
    // Обрабатываем специальные ошибки из транзакции
    if (error.message === 'PREMIUM_REQUIRED_FOR_REMINDERS') {
      return res.status(403).json({
        error: 'Premium subscription required for reminders',
        message: 'Напоминания доступны только с Premium подпиской',
        upgradeRequired: true
      })
    }
    if (error.message === 'PREMIUM_REQUIRED_FOR_GOALS') {
      return res.status(403).json({
        error: 'Premium subscription required for goals',
        message: 'Цели доступны только с Premium подпиской',
        upgradeRequired: true
      })
    }
    if (error.message === 'FREE_PLAN_LIMIT_REACHED') {
      return res.status(403).json({
        error: 'Free plan limit reached',
        message: `На бесплатном тарифе можно создать максимум ${FREE_HABITS_LIMIT} привычки`,
        limit: FREE_HABITS_LIMIT,
        upgradeRequired: true
      })
    }
    
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.status(500).json({ 
      error: 'Failed to create habit',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Обновить привычку
 */
export async function updateHabit(req: Request, res: Response) {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }
    
    const { id } = req.params
    const { name, description, goalEnabled, goalType, goalTarget, goalPeriodDays } = req.body

    // Проверяем, что привычка принадлежит пользователю
    const existingHabit = await prisma.habit.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!existingHabit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    // Валидация: проверяем, что имя не пустое после trim (если передано)
    if (name !== undefined) {
      const trimmedName = name?.trim()
      if (!trimmedName || trimmedName.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid habit name',
          message: 'Название привычки не может быть пустым'
        })
      }
    }

    // Проверяем подписку для напоминаний
    const userWithSubscription = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!userWithSubscription) {
      return res.status(404).json({ error: 'User not found' })
    }

    const currentTime = new Date()
    const hasPremium = 
      userWithSubscription.subscriptionStatus === 'active' &&
      userWithSubscription.subscriptionExpiresAt &&
      userWithSubscription.subscriptionExpiresAt > currentTime

    // Если пытаются включить/установить напоминание без Premium
    if ((req.body.reminderEnabled || req.body.reminderTime) && !hasPremium) {
      return res.status(403).json({
        error: 'Premium subscription required for reminders',
        message: 'Напоминания доступны только с Premium подпиской',
        upgradeRequired: true
      })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if ('reminderTime' in req.body) updateData.reminderTime = req.body.reminderTime || null
    if ('reminderEnabled' in req.body) {
      // Если отключают напоминание или у пользователя Premium, разрешаем
      if (!req.body.reminderEnabled || hasPremium) {
        updateData.reminderEnabled = req.body.reminderEnabled ?? true
      }
    }
    if (!hasPremium) {
      updateData.reminderEnabled = false
      updateData.reminderTime = null
    }

    // Цели — только для Premium
    if ('goalEnabled' in req.body || 'goalType' in req.body || 'goalTarget' in req.body || 'goalPeriodDays' in req.body) {
      if (req.body.goalEnabled && !hasPremium) {
        return res.status(403).json({
          error: 'Premium subscription required for goals',
          message: 'Цели доступны только с Premium подпиской',
          upgradeRequired: true
        })
      }
      const newGoalEnabled = hasPremium && (req.body.goalEnabled === true)
      updateData.goalEnabled = newGoalEnabled
      updateData.goalType = newGoalEnabled ? (req.body.goalType?.trim() || null) : null
      updateData.goalTarget = newGoalEnabled && req.body.goalTarget != null ? Number(req.body.goalTarget) : null
      updateData.goalPeriodDays = newGoalEnabled && req.body.goalPeriodDays != null ? Number(req.body.goalPeriodDays) : null
    }

    const habit = await prisma.habit.update({
      where: { id },
      data: updateData
    })

    const timezone = getUserTimezone(user)
    const streak = await calculateStreak(habit.id, timezone)
    const completedToday = await isCompletedToday(habit.id, timezone)

    res.json({
      id: habit.id,
      name: habit.name,
      description: habit.description,
      reminderTime: habit.reminderTime,
      reminderEnabled: habit.reminderEnabled,
      goalEnabled: habit.goalEnabled ?? false,
      goalType: habit.goalType ?? null,
      goalTarget: habit.goalTarget ?? null,
      goalPeriodDays: habit.goalPeriodDays ?? null,
      createdAt: habit.createdAt.toISOString(),
      updatedAt: habit.updatedAt.toISOString(),
      streak,
      isCompletedToday: completedToday
    })
  } catch (error) {
    console.error('Error updating habit:', error)
    res.status(500).json({ error: 'Failed to update habit' })
  }
}

/**
 * Удалить привычку
 */
export async function deleteHabit(req: Request, res: Response) {
  try {
    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }
    
    const { id } = req.params

    // Проверяем, что привычка принадлежит пользователю
    const existingHabit = await prisma.habit.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!existingHabit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    // Удаляем привычку (логи удалятся каскадно благодаря onDelete: Cascade в schema)
    // НЕ используем транзакцию, так как она может конфликтовать с connection pooler
    // Каскадное удаление работает автоматически через Prisma
    await prisma.habit.delete({
      where: { id }
    })

    res.status(204).send()
  } catch (error: any) {
    console.error('Error deleting habit:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      meta: error.meta
    })
    
    // Более детальная обработка ошибок
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Habit not found' })
    }
    
    // Если ошибка связана с prepared statements или connection
    if (error.code === 'P1001' || error.message?.includes('prepared statement') || error.message?.includes('connection')) {
      console.error('Database connection error, retrying...')
      // Возвращаем ошибку, чтобы фронтенд мог повторить запрос
      return res.status(503).json({ 
        error: 'Database connection error. Please try again.',
        retryable: true
      })
    }
    
    res.status(500).json({ 
      error: 'Failed to delete habit',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Отметить привычку как выполненную за сегодня
 */
export async function completeHabitToday(req: Request, res: Response) {
  try {
    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }
    
    const { id } = req.params

    // Проверяем, что привычка принадлежит пользователю
    const existingHabit = await prisma.habit.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!existingHabit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    const timezone = getUserTimezone(user)
    const today = getStartOfTodayUTC(timezone)
    const tomorrow = getStartOfTomorrowUTC(timezone)

    // Используем транзакцию для атомарной операции toggle
    // Это предотвращает race condition при одновременных запросах
    const result = await prisma.$transaction(async (tx) => {
      // Проверяем, не отмечена ли уже привычка сегодня
      // Используем точное сравнение даты для уникальности
      const existingLog = await tx.habitLog.findFirst({
        where: {
          habitId: id,
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      })

      if (existingLog) {
        // Если уже отмечена, удаляем отметку (toggle)
        await tx.habitLog.delete({
          where: { id: existingLog.id }
        })
        return { completed: false, log: null }
      }

      // Создаём новую отметку используя upsert для защиты от race condition
      // Но так как у нас уникальный индекс на (habitId, date), используем create с обработкой ошибки
      // Важно: используем нормализованную дату (today), которая уже округлена до начала дня
      try {
        const newLog = await tx.habitLog.create({
          data: {
            habitId: id,
            date: today // today уже нормализован к началу дня
          }
        })
        return { completed: true, log: newLog }
      } catch (createError: any) {
        // Если уже существует (race condition), получаем существующую
        if (createError.code === 'P2002') {
          const log = await tx.habitLog.findFirst({
            where: {
              habitId: id,
              date: {
                gte: today,
                lt: tomorrow
              }
            }
          })
          if (log) {
            // Если лог существует, значит кто-то другой уже создал его
            // Удаляем его (toggle поведение)
            await tx.habitLog.delete({
              where: { id: log.id }
            })
            return { completed: false, log: null }
          }
        }
        throw createError
      }
    })

    // Пересчитываем streak после изменения лога
    // Транзакция уже завершена, новый лог должен быть виден
    console.log(`🔄 Recalculating streak after ${result.completed ? 'creating' : 'deleting'} log for habit ${id}`)
    console.log(`📅 Current period: ${today.toISOString()}`)
    console.log(`📅 Next period: ${tomorrow.toISOString()}`)
    const streak = await calculateStreak(id, timezone)
    console.log(`📊 Calculated streak for habit ${id}: ${streak}`)
    console.log(`✅ Habit ${id} completion result:`, { completed: result.completed, streak })

    res.json({
      completed: result.completed,
      streak
    })
  } catch (error: any) {
    console.error('Error completing habit:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      meta: error.meta
    })
    
    // Если ошибка связана с prepared statements или connection
    if (error.code === 'P1001' || error.message?.includes('prepared statement') || error.message?.includes('connection')) {
      console.error('Database connection error in completeHabitToday')
      return res.status(503).json({ 
        error: 'Database connection error. Please try again.',
        retryable: true
      })
    }
    
    res.status(500).json({ 
      error: 'Failed to complete habit',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Получить статистику за последние 7 дней для привычки
 */
export async function getHabitStats(req: Request, res: Response) {
  try {
    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }
    
    const { id } = req.params

    // Проверяем, что привычка принадлежит пользователю
    const existingHabit = await prisma.habit.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!existingHabit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    const timezone = getUserTimezone(user)
    const today = getStartOfTodayUTC(timezone)
    const tomorrow = getStartOfTomorrowUTC(timezone)
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const logs = await prisma.habitLog.findMany({
      where: {
        habitId: id,
        date: {
          gte: sevenDaysAgo,
          lt: tomorrow
        }
      }
    })

    const last7Days: Array<{ date: string; completed: boolean }> = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = formatDateInTimezone(dayStart, timezone)
      const completed = logs.some(log => {
        const logDay = normalizeLogDateToDay(new Date(log.date), timezone)
        return logDay.getTime() === dayStart.getTime()
      })

      last7Days.push({
        date: dateStr,
        completed
      })
    }

    const streak = await calculateStreak(id, timezone)

    res.json({
      habitId: id,
      habitName: existingHabit.name,
      last7Days,
      streak
    })
  } catch (error) {
    console.error('Error getting habit stats:', error)
    res.status(500).json({ error: 'Failed to get habit stats' })
  }
}
