/**
 * Утилиты для работы с API ЮКассы (YooKassa)
 * Документация: https://yookassa.ru/developers/api
 */

import * as crypto from 'crypto'
import { config } from '../config'

interface PaymentRequest {
  amount: {
    value: string
    currency: string
  }
  description: string
  capture: boolean
  confirmation: {
    type: 'redirect'
    return_url: string
  }
  metadata?: Record<string, string>
}

interface PaymentResponse {
  id: string
  status: string
  amount: {
    value: string
    currency: string
  }
  description: string
  metadata?: Record<string, string>
  confirmation?: {
    confirmation_url: string
  }
  created_at: string
}

/**
 * Создание платежа в ЮКассе
 */
export async function createPayment(
  shopId: string,
  secretKey: string,
  amount: number,
  description: string,
  returnUrl: string,
  metadata?: Record<string, string>,
  idempotenceKey?: string
): Promise<PaymentResponse> {
  const apiUrl = config.yookassa.apiUrl
  
  const paymentData: PaymentRequest = {
    amount: {
      value: amount.toFixed(2),
      currency: 'RUB'
    },
    description,
    capture: true, // Автоматическое подтверждение платежа
    confirmation: {
      type: 'redirect',
      return_url: returnUrl
    },
    metadata: metadata || {}
  }

  const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64')

  // Используем переданный idempotence ключ или генерируем случайный
  // ВАЖНО: для предотвращения дублей ключ должен быть стабильным (userId+planId)
  const finalIdempotenceKey = idempotenceKey || `${Date.now()}-${Math.random()}`

  const response = await fetch(`${apiUrl}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotence-Key': finalIdempotenceKey,
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify(paymentData)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`YooKassa API error: ${response.status} - ${error}`)
  }

  return response.json() as Promise<PaymentResponse>
}

/**
 * Получение информации о платеже
 */
export async function getPayment(
  shopId: string,
  secretKey: string,
  paymentId: string
): Promise<PaymentResponse> {
  const apiUrl = config.yookassa.apiUrl
  
  const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64')

  const response = await fetch(`${apiUrl}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`YooKassa API error: ${response.status} - ${error}`)
  }

  return response.json() as Promise<PaymentResponse>
}

/**
 * Валидация подписи webhook от ЮКассы
 * 
 * YooKassa использует HTTP-уведомления с подписью для безопасности.
 * Документация: https://yookassa.ru/developers/using-api/webhooks
 * 
 * Подпись вычисляется как SHA256 хеш от конкатенации:
 * event_type + '&' + object.id + '&' + object.status + '&' + secret_key
 */
export function validateWebhookSignature(
  eventType: string,
  objectId: string,
  objectStatus: string,
  receivedSignature: string,
  secretKey: string
): boolean {
  // В тестовом режиме пропускаем проверку
  // YooKassa может не отправлять подпись в тестовом режиме
  if (config.yookassa.isTestMode) {
    console.log('🧪 Test mode: skipping webhook signature validation')
    return true
  }
  
  // В продакшене обязательно проверяем подпись
  if (!receivedSignature) {
    console.error('❌ Webhook signature is missing in production mode')
    return false
  }
  
  try {
    // Формируем строку для подписи согласно документации YooKassa
    // Формат: notification_type&object_id&объект_статуса
    // Пример: payment.succeeded&payment_id&succeeded
    const signatureString = `${eventType}&${objectId}&${objectStatus}&${secretKey}`
    
    // Вычисляем SHA-256 хеш
    const calculatedSignature = crypto
      .createHash('sha256')
      .update(signatureString)
      .digest('hex')
    
    // Сравниваем подписи (case-insensitive)
    const isValid = calculatedSignature.toLowerCase() === receivedSignature.toLowerCase()
    
    if (!isValid) {
      console.error('❌ Webhook signature validation failed')
      console.error('   Expected:', calculatedSignature)
      console.error('   Received:', receivedSignature)
    } else {
      console.log('✅ Webhook signature validated successfully')
    }
    
    return isValid
  } catch (error) {
    console.error('❌ Error validating webhook signature:', error)
    return false
  }
}

/**
 * Альтернативная проверка подписи webhook (если YooKassa использует другой формат)
 * Некоторые платежные системы используют HMAC-SHA256 вместо простого SHA256
 */
export function validateWebhookSignatureHMAC(
  requestBody: string,
  receivedSignature: string,
  secretKey: string
): boolean {
  if (config.yookassa.isTestMode) {
    console.log('🧪 Test mode: skipping HMAC webhook signature validation')
    return true
  }
  
  if (!receivedSignature) {
    console.error('❌ Webhook signature is missing in production mode')
    return false
  }
  
  try {
    // Вычисляем HMAC-SHA256
    const hmac = crypto.createHmac('sha256', secretKey)
    hmac.update(requestBody)
    const calculatedSignature = hmac.digest('hex')
    
    const isValid = calculatedSignature.toLowerCase() === receivedSignature.toLowerCase()
    
    if (!isValid) {
      console.error('❌ HMAC webhook signature validation failed')
    } else {
      console.log('✅ HMAC webhook signature validated successfully')
    }
    
    return isValid
  } catch (error) {
    console.error('❌ Error validating HMAC webhook signature:', error)
    return false
  }
}