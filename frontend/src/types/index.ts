// Типы для Frontend

export interface Habit {
  id: string
  name: string
  description: string | null
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
}

export interface UpdateHabitDto {
  name?: string
  description?: string
}
