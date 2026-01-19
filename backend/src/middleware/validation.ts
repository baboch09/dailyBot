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
    .withMessage('Описание не должно превышать 500 символов')
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
    .withMessage('Описание не должно превышать 500 символов')
]
