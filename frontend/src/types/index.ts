// Типы для Frontend

export interface Habit {
  id: string
  name: string
  description: string | null
  reminderTime?: string | null // Время напоминания в формате "HH:MM" (например "09:00")
  reminderEnabled?: boolean
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
  reminderTime?: string | null // Время напоминания в формате "HH:MM" (например "09:00")
  reminderEnabled?: boolean
}

export interface UpdateHabitDto {
  name?: string
  description?: string
  reminderTime?: string | null // Время напоминания в формате "HH:MM" (например "09:00")
  reminderEnabled?: boolean
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
  planId: 'month' | 'year'
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