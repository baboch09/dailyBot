import { Router } from 'express'
import { webhook } from '../controllers/payments.controller'

const router = Router()

// Webhook от ЮКассы (не требует аутентификации через telegram_id)
// Но должен проверяться через подпись от ЮКассы
router.post('/webhook', webhook)

export default router