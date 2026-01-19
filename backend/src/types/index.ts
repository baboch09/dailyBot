// Типы для API

export interface CreateHabitDto {
  name: string
  description?: string
}

export interface UpdateHabitDto {
  name?: string
  description?: string
}

export interface HabitResponse {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  streak: number
  isCompletedToday: boolean
}

export interface HabitLogResponse {
  date: string
  completed: boolean
}

export interface StatsResponse {
  habitId: string
  habitName: string
  last7Days: HabitLogResponse[]
  streak: number
}
