import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { calculateStreak, isCompletedToday } from '../utils/streak'
import { validationResult } from 'express-validator'

/**
 * Получить все привычки пользователя
 */
export async function getHabits(req: Request, res: Response) {
  try {
    const user = (req as any).user

    const habits = await prisma.habit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    // Добавляем streak и флаг выполнения за сегодня для каждой привычки
    const habitsWithStats = await Promise.all(
      habits.map(async (habit) => ({
        id: habit.id,
        name: habit.name,
        description: habit.description,
        reminderTime: habit.reminderTime,
        reminderEnabled: habit.reminderEnabled,
        createdAt: habit.createdAt.toISOString(),
        updatedAt: habit.updatedAt.toISOString(),
        streak: await calculateStreak(habit.id),
        isCompletedToday: await isCompletedToday(habit.id)
      }))
    )

    res.json(habitsWithStats)
  } catch (error) {
    console.error('Error getting habits:', error)
    res.status(500).json({ error: 'Failed to get habits' })
  }
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

    const user = (req as any).user
    const { name, description, reminderTime, reminderEnabled } = req.body

    // Дополнительная проверка лимита перед созданием (защита от race condition)
    const userWithSubscription = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        habits: true
      }
    })

    if (!userWithSubscription) {
      return res.status(404).json({ error: 'User not found' })
    }

    const now = new Date()
    const isPremium = 
      userWithSubscription.subscriptionStatus === 'active' &&
      userWithSubscription.subscriptionExpiresAt &&
      userWithSubscription.subscriptionExpiresAt > now

    const FREE_HABITS_LIMIT = 3
    if (!isPremium && userWithSubscription.habits.length >= FREE_HABITS_LIMIT) {
      return res.status(403).json({
        error: 'Free plan limit reached',
        message: `На бесплатном тарифе можно создать максимум ${FREE_HABITS_LIMIT} привычки`,
        limit: FREE_HABITS_LIMIT,
        current: userWithSubscription.habits.length,
        upgradeRequired: true
      })
    }

    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        reminderTime: reminderTime || null,
        reminderEnabled: reminderEnabled ?? true
      }
    })

    const streak = await calculateStreak(habit.id)
    const completedToday = await isCompletedToday(habit.id)

    res.status(201).json({
      id: habit.id,
      name: habit.name,
      description: habit.description,
      reminderTime: habit.reminderTime,
      reminderEnabled: habit.reminderEnabled,
      createdAt: habit.createdAt.toISOString(),
      updatedAt: habit.updatedAt.toISOString(),
      streak,
      isCompletedToday: completedToday
    })
  } catch (error) {
    console.error('Error creating habit:', error)
    res.status(500).json({ error: 'Failed to create habit' })
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

    const user = (req as any).user
    const { id } = req.params
    const { name, description } = req.body

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

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if ('reminderTime' in req.body) updateData.reminderTime = req.body.reminderTime || null
    if ('reminderEnabled' in req.body) updateData.reminderEnabled = req.body.reminderEnabled ?? true

    const habit = await prisma.habit.update({
      where: { id },
      data: updateData
    })

    const streak = await calculateStreak(habit.id)
    const completedToday = await isCompletedToday(habit.id)

    res.json({
      id: habit.id,
      name: habit.name,
      description: habit.description,
      reminderTime: habit.reminderTime,
      reminderEnabled: habit.reminderEnabled,
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
    const user = (req as any).user
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
    const user = (req as any).user
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

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Проверяем, не отмечена ли уже привычка сегодня
    const existingLog = await prisma.habitLog.findFirst({
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
      try {
        await prisma.habitLog.delete({
          where: { id: existingLog.id }
        })
      } catch (deleteError: any) {
        // Если ошибка при удалении (может быть уже удалена), просто продолжаем
        if (deleteError.code !== 'P2025') {
          console.error('Error deleting habit log:', deleteError)
          throw deleteError
        }
      }

      const streak = await calculateStreak(id)
      return res.json({
        completed: false,
        streak
      })
    }

    // Создаём новую отметку
    // Используем upsert для предотвращения конфликтов
    try {
      await prisma.habitLog.create({
        data: {
          habitId: id,
          date: today
        }
      })
    } catch (createError: any) {
      // Если уже существует (race condition), просто получаем существующую
      if (createError.code === 'P2002') {
        const log = await prisma.habitLog.findFirst({
          where: {
            habitId: id,
            date: {
              gte: today,
              lt: tomorrow
            }
          }
        })
        
        if (!log) {
          throw createError
        }
      } else {
        throw createError
      }
    }

    const streak = await calculateStreak(id)

    res.json({
      completed: true,
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
    const user = (req as any).user
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

    // Вычисляем дату 7 дней назад
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    // Получаем все логи за последние 7 дней
    const logs = await prisma.habitLog.findMany({
      where: {
        habitId: id,
        date: {
          gte: sevenDaysAgo,
          lt: tomorrow
        }
      }
    })

    // Создаём массив для последних 7 дней
    const last7Days: Array<{ date: string; completed: boolean }> = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const dateStr = date.toISOString().split('T')[0]
      const completed = logs.some(log => {
        const logDate = new Date(log.date)
        logDate.setHours(0, 0, 0, 0)
        return logDate.getTime() === date.getTime()
      })

      last7Days.push({
        date: dateStr,
        completed
      })
    }

    const streak = await calculateStreak(id)

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
