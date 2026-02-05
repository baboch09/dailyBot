import { body, ValidationChain } from 'express-validator'

/**
 * Валидация для создания привычки
 */
export const createHabitValidation: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Название привычки обязательно')
    .isLength({ min: 1, max: 100 })
    .withMessage('Название должно быть от 1 до 100 символов'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Описание не должно превышать 500 символов'),
  body('reminderTime')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value || value === '' || value === null) return true
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(value)) {
        throw new Error('Время напоминания должно быть в формате HH:MM (например, 09:30)')
      }
      return true
    }),
  body('reminderEnabled').optional().isBoolean().withMessage('reminderEnabled должен быть boolean'),
  body('goalEnabled').optional().isBoolean().withMessage('goalEnabled должен быть boolean'),
  body('goalType').optional().trim().isIn(['streak', 'count', 'period']).withMessage('goalType: streak, count или period'),
  body('goalTarget').optional().isInt({ min: 1, max: 365 }).withMessage('goalTarget от 1 до 365'),
  body('goalPeriodDays').optional().isInt({ min: 1, max: 365 }).withMessage('goalPeriodDays от 1 до 365')
]

/**
 * Валидация для обновления привычки
 */
export const updateHabitValidation: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Название не может быть пустым')
    .isLength({ min: 1, max: 100 })
    .withMessage('Название должно быть от 1 до 100 символов'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Описание не должно превышать 500 символов'),
  body('reminderTime')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // Если значение не передано, null или пустая строка - разрешаем
      if (!value || value === '' || value === null) {
        return true
      }
      // Если передано - проверяем формат
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(value)) {
        throw new Error('Время напоминания должно быть в формате HH:MM (например, 09:30)')
      }
      return true
    }),
  body('reminderEnabled').optional().isBoolean().withMessage('reminderEnabled должен быть boolean'),
  body('goalEnabled').optional().isBoolean().withMessage('goalEnabled должен быть boolean'),
  body('goalType').optional().trim().isIn(['streak', 'count', 'period']).withMessage('goalType: streak, count или period'),
  body('goalTarget').optional().isInt({ min: 1, max: 365 }).withMessage('goalTarget от 1 до 365'),
  body('goalPeriodDays').optional().isInt({ min: 1, max: 365 }).withMessage('goalPeriodDays от 1 до 365')
]
