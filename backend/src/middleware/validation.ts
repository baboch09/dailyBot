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
  body('reminderDays')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true
      const parts = value.split(',').map((s) => parseInt(s.trim(), 10))
      if (parts.some((n) => isNaN(n) || n < 1 || n > 7)) {
        throw new Error('reminderDays: только цифры 1–7 через запятую (1=Пн, 7=Вс)')
      }
      return true
    }),
  body('goalEnabled').optional().isBoolean().withMessage('goalEnabled должен быть boolean'),
  body('goalType').optional().trim().isIn(['streak']).withMessage('goalType: только streak (серия дней)'),
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
  body('reminderDays')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true
      const parts = value.split(',').map((s) => parseInt(s.trim(), 10))
      if (parts.some((n) => isNaN(n) || n < 1 || n > 7)) {
        throw new Error('reminderDays: только цифры 1–7 через запятую (1=Пн, 7=Вс)')
      }
      return true
    }),
  body('goalEnabled').optional().isBoolean().withMessage('goalEnabled должен быть boolean'),
  body('goalType').optional().trim().isIn(['streak']).withMessage('goalType: только streak (серия дней)'),
  body('goalTarget').optional().isInt({ min: 1, max: 365 }).withMessage('goalTarget от 1 до 365'),
  body('goalPeriodDays').optional().isInt({ min: 1, max: 365 }).withMessage('goalPeriodDays от 1 до 365')
]
