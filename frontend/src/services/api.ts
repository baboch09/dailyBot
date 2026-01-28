import axios from 'axios'
import { getTelegramUserId, getTelegramUsername } from '../utils/telegram'
import type { 
  Habit, 
  HabitStats, 
  CreateHabitDto, 
  UpdateHabitDto,
  SubscriptionStatus,
  SubscriptionPlansResponse,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentStatusResponse,
  LatestPaymentStatusResponse
} from '../types'

// URL backend API
// Определяем автоматически на основе текущего домена
const getApiUrl = () => {
  // Если указан явный URL в переменных окружения
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // В продакшене (Vercel, любой домен) используем относительный путь
  // Vercel автоматически направляет /api на serverless functions
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // Production (Vercel, любой хостинг)
    if (hostname.includes('vercel.app') || 
        hostname.includes('vercel.com') ||
        hostname.includes('.') && !hostname.includes('localhost')) {
      return '/api'
    }
    
    // Локальная разработка
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5001/api'
    }
  }
  
  // По умолчанию относительный путь (работает везде)
  return '/api'
}

const API_URL = getApiUrl()

// Создаём экземпляр axios с базовой конфигурацией
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Интерцептор для добавления telegram_id и username в заголовки
api.interceptors.request.use((config) => {
  try {
    const telegramId = getTelegramUserId()
    if (telegramId) {
      config.headers['x-telegram-id'] = telegramId.toString()
      console.log('Added x-telegram-id header:', telegramId)
    } else {
      console.warn('No telegram_id available - request might fail authentication')
    }

    // Добавляем username если доступен
    const telegramUsername = getTelegramUsername()
    if (telegramUsername) {
      config.headers['x-telegram-username'] = telegramUsername
      console.log('Added x-telegram-username header:', telegramUsername)
    }
  } catch (error) {
    console.error('Error setting telegram headers:', error)
  }
  
  return config
})

// API методы для работы с привычками
export const habitsApi = {
  // Получить все привычки
  getAll: async (): Promise<Habit[]> => {
    const response = await api.get<Habit[]>('/habits')
    return response.data
  },

  // Создать привычку
  create: async (data: CreateHabitDto): Promise<Habit> => {
    const response = await api.post<Habit>('/habits', data)
    return response.data
  },

  // Обновить привычку
  update: async (id: string, data: UpdateHabitDto): Promise<Habit> => {
    const response = await api.put<Habit>(`/habits/${id}`, data)
    return response.data
  },

  // Удалить привычку
  delete: async (id: string): Promise<void> => {
    await api.delete(`/habits/${id}`)
  },

  // Отметить привычку как выполненную за сегодня
  completeToday: async (id: string): Promise<{ completed: boolean; streak: number }> => {
    const response = await api.post<{ completed: boolean; streak: number }>(
      `/habits/${id}/complete`
    )
    return response.data
  },

  // Получить статистику за последние 7 дней
  getStats: async (id: string): Promise<HabitStats> => {
    const response = await api.get<HabitStats>(`/habits/${id}/stats`)
    return response.data
  }
}

// API методы для работы с подпиской
export const subscriptionApi = {
  // Получить статус подписки
  getStatus: async (): Promise<SubscriptionStatus> => {
    const response = await api.get<SubscriptionStatus>('/subscription/status')
    return response.data
  },

  // Получить список тарифов
  getPlans: async (): Promise<SubscriptionPlansResponse> => {
    const response = await api.get<SubscriptionPlansResponse>('/subscription/plans')
    return response.data
  },

  // Создать платеж
  createPayment: async (data: CreatePaymentRequest): Promise<CreatePaymentResponse> => {
    const response = await api.post<CreatePaymentResponse>('/subscription/create-payment', data)
    return response.data
  },

  // Проверить статус платежа
  checkPaymentStatus: async (paymentId: string): Promise<PaymentStatusResponse> => {
    const response = await api.get<PaymentStatusResponse>(`/subscription/payment/${paymentId}/status`)
    return response.data
  },

  // Проверить статус последнего платежа (для обработки возврата после оплаты)
  checkLatestPaymentStatus: async (): Promise<LatestPaymentStatusResponse> => {
    const response = await api.get<LatestPaymentStatusResponse>('/subscription/check-latest-payment')
    return response.data
  }
}
