import { Router } from 'express'
import {
  getSubscriptionStatus,
  getSubscriptionPlans,
  createSubscriptionPayment,
  checkPaymentStatus,
  checkLatestPaymentStatus
} from '../controllers/subscription.controller'
import { authenticateUser } from '../middleware/auth'

const router = Router()

// Все routes требуют аутентификации
router.use(authenticateUser)

// Получить статус подписки
router.get('/status', getSubscriptionStatus)

// Получить список доступных тарифов
router.get('/plans', getSubscriptionPlans)

// Создать платеж для подписки
router.post('/create-payment', createSubscriptionPayment)

// Проверить статус платежа
router.get('/payment/:paymentId/status', checkPaymentStatus)

// Проверить статус последнего платежа пользователя (для обработки возврата после оплаты)
router.get('/check-latest-payment', checkLatestPaymentStatus)

export default router