import { Router } from 'express'
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  completeHabitToday,
  getHabitStats
} from '../controllers/habits.controller'
import { authenticateUser } from '../middleware/auth'
import { checkFreeLimits } from '../middleware/subscription'
import { createHabitValidation, updateHabitValidation } from '../middleware/validation'

const router = Router()

// Все routes требуют аутентификации
router.use(authenticateUser)

// Получить все привычки пользователя
router.get('/', getHabits)

// Создать новую привычку - проверяем лимиты Free плана
router.post('/', createHabitValidation, checkFreeLimits, createHabit)

// Получить статистику для конкретной привычки
router.get('/:id/stats', getHabitStats)

// Отметить привычку как выполненную за сегодня
router.post('/:id/complete', completeHabitToday)

// Обновить привычку
router.put('/:id', updateHabitValidation, updateHabit)

// Удалить привычку
router.delete('/:id', deleteHabit)

export default router
