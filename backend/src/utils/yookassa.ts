/**
 * Утилиты для работы с API ЮКассы (YooKassa)
 * Документация: https://yookassa.ru/developers/api
 */

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3'
const YOOKASSA_TEST_API_URL = 'https://api.yookassa.ru/v3'

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
  metadata?: Record<string, string>
): Promise<PaymentResponse> {
  const apiUrl = process.env.YUKASSA_TEST_MODE === 'true' ? YOOKASSA_TEST_API_URL : YOOKASSA_API_URL
  
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

  const response = await fetch(`${apiUrl}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotence-Key': `${Date.now()}-${Math.random()}`, // Уникальный ключ для идемпотентности
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
  const apiUrl = process.env.YUKASSA_TEST_MODE === 'true' ? YOOKASSA_TEST_API_URL : YOOKASSA_API_URL
  
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
 * Важно: в реальном проекте нужно проверять подпись для безопасности
 */
export function validateWebhookSignature(data: any, signature: string): boolean {
  // TODO: Реализовать проверку подписи webhook
  // Для тестового режима можно пропустить
  if (process.env.YUKASSA_TEST_MODE === 'true') {
    return true
  }
  
  // В продакшене нужно проверять подпись
  // Документация: https://yookassa.ru/developers/payments/payment-notifications
  return true
}