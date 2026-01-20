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

    await prisma.habit.delete({
      where: { id }
    })

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting habit:', error)
    res.status(500).json({ error: 'Failed to delete habit' })
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

    // Проверяем, не отмечена ли уже привычка сегодня
    const existingLog = await prisma.habitLog.findFirst({
      where: {
        habitId: id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    })

    if (existingLog) {
      // Если уже отмечена, удаляем отметку (toggle)
      await prisma.habitLog.delete({
        where: { id: existingLog.id }
      })

      const streak = await calculateStreak(id)
      return res.json({
        completed: false,
        streak
      })
    }

    // Создаём новую отметку
    await prisma.habitLog.create({
      data: {
        habitId: id,
        date: today
      }
    })

    const streak = await calculateStreak(id)

    res.json({
      completed: true,
      streak
    })
  } catch (error) {
    console.error('Error completing habit:', error)
    res.status(500).json({ error: 'Failed to complete habit' })
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
