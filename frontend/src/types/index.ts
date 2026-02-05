// Типы для Frontend

export interface Habit {
  id: string
  name: string
  description: string | null
  reminderTime?: string | null
  reminderEnabled?: boolean
  goalEnabled?: boolean
  goalType?: string | null // 'streak' | 'count' | 'period'
  goalTarget?: number | null
  goalPeriodDays?: number | null
  createdAt: string
  updatedAt: string
  streak: number
  isCompletedToday: boolean
}

export interface HabitLog {
  date: string
  completed: boolean
}

export interface HabitStats {
  habitId: string
  habitName: string
  last7Days: HabitLog[]
  streak: number
}

export interface CreateHabitDto {
  name: string
  description?: string
  reminderTime?: string | null
  reminderEnabled?: boolean
  goalEnabled?: boolean
  goalType?: string
  goalTarget?: number
  goalPeriodDays?: number
}

export interface UpdateHabitDto {
  name?: string
  description?: string
  reminderTime?: string | null
  reminderEnabled?: boolean
  goalEnabled?: boolean
  goalType?: string
  goalTarget?: number
  goalPeriodDays?: number
}

// Типы для подписки
export interface SubscriptionStatus {
  subscriptionType: 'free' | 'premium' | 'trial'
  subscriptionStatus: 'active' | 'expired' | 'canceled' | 'free'
  subscriptionExpiresAt: string | null
  subscriptionStartedAt: string | null
  daysRemaining: number
  recentPayments: Array<{
    id: string
    amount: number
    status: string
    createdAt: string
    isActive?: boolean // true если это текущая активная подписка
  }>
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  durationDays: number
}

export interface SubscriptionPlansResponse {
  plans: SubscriptionPlan[]
}

export interface CreatePaymentRequest {
  planId: 'month' | 'year' | 'lifetime'
}

export interface CreatePaymentResponse {
  paymentId: string
  yookassaId: string
  amount: number
  confirmationUrl: string
  status: string
}

export interface PaymentStatusResponse {
  paymentId: string
  status: string
  subscriptionActive: boolean
}

export interface LatestPaymentStatusResponse {
  hasPayment: boolean
  paymentId?: string
  status?: string
  subscriptionActive?: boolean
  message?: string
}