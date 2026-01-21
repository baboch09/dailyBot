import React, { useState, useEffect } from 'react'
import { Habit } from '../types'
import { habitsApi } from '../services/api'

interface HabitItemProps {
  habit: Habit
  onUpdate: () => void
  onDelete?: (id: string) => void // Оставлено для обратной совместимости, но не используется
  isPremium?: boolean
  onScrollToSubscription?: () => void
}

const HabitItem: React.FC<HabitItemProps> = ({ habit, onUpdate, isPremium = false, onScrollToSubscription }) => {
  const [isCompleting, setIsCompleting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditingReminder, setIsEditingReminder] = useState(false)
  const [reminderTime, setReminderTime] = useState(habit.reminderTime || '09:00')
  const [reminderEnabled, setReminderEnabled] = useState(habit.reminderEnabled ?? true)
  const [isUpdatingReminder, setIsUpdatingReminder] = useState(false)

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await habitsApi.completeToday(habit.id)
      onUpdate()
    } catch (error: any) {
      console.error('Error completing habit:', error)
      
      // Если ошибка retryable, предлагаем повторить
      if (error.response?.status === 503 && error.response?.data?.retryable) {
        if (confirm('Ошибка подключения к базе данных. Попробовать ещё раз?')) {
          setTimeout(() => handleComplete(), 1000)
        }
      } else {
        alert(error.response?.data?.error || 'Ошибка при отметке привычки')
      }
    } finally {
      setIsCompleting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Удалить привычку "${habit.name}"?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await habitsApi.delete(habit.id)
      // Вызываем onUpdate вместо onDelete для перезагрузки списка
      onUpdate()
    } catch (error: any) {
      console.error('Error deleting habit:', error)
      
      // Если ошибка retryable, предлагаем повторить
      if (error.response?.status === 503 && error.response?.data?.retryable) {
        if (confirm('Ошибка подключения к базе данных. Попробовать ещё раз?')) {
          setTimeout(() => handleDelete(), 1000)
        }
      } else {
        alert(error.response?.data?.error || 'Ошибка при удалении привычки')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateReminder = async () => {
    setIsUpdatingReminder(true)
    try {
      await habitsApi.update(habit.id, {
        reminderTime: reminderEnabled ? reminderTime : null,
        reminderEnabled: reminderEnabled
      })
      setIsEditingReminder(false)
      onUpdate()
    } catch (error) {
      console.error('Error updating reminder:', error)
      alert('Ошибка при обновлении напоминания')
    } finally {
      setIsUpdatingReminder(false)
    }
  }

  const formatTime = (time: string | null | undefined) => {
    if (!time) return null
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Определение стадии streak с разными визуальными состояниями
  const getStreakStage = (streak: number) => {
    if (streak === 0) {
      return {
        emoji: '',
        label: 'Новая привычка',
        gradient: 'from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600',
        textColor: 'text-gray-600 dark:text-gray-400',
        showBadge: false
      }
    } else if (streak >= 1 && streak < 7) {
      return {
        emoji: '🌱',
        label: 'Начало пути',
        gradient: 'from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30',
        textColor: 'text-green-700 dark:text-green-300',
        showBadge: true
      }
    } else if (streak >= 7 && streak < 21) {
      return {
        emoji: '🔥',
        label: 'В процессе',
        gradient: 'from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30',
        textColor: 'text-orange-700 dark:text-orange-300',
        showBadge: true
      }
    } else if (streak >= 21 && streak < 66) {
      return {
        emoji: '⚡',
        label: 'Отличный результат',
        gradient: 'from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30',
        textColor: 'text-blue-700 dark:text-blue-300',
        showBadge: true
      }
    } else if (streak >= 66 && streak < 100) {
      return {
        emoji: '⭐',
        label: 'Мастер',
        gradient: 'from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30',
        textColor: 'text-purple-700 dark:text-purple-300',
        showBadge: true
      }
    } else {
      return {
        emoji: '👑',
        label: 'Легенда',
        gradient: 'from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30',
        textColor: 'text-yellow-700 dark:text-yellow-300',
        showBadge: true
      }
    }
  }

  // Таймер обратного отсчета для последних 30 минут перед напоминанием
  const [timeUntilReminder, setTimeUntilReminder] = useState<number | null>(null)

  useEffect(() => {
    if (!habit.reminderTime || !habit.reminderEnabled || habit.isCompletedToday) {
      setTimeUntilReminder(null)
      return
    }

    const calculateTimeUntilReminder = () => {
      const now = new Date()
      const [hours, minutes] = habit.reminderTime!.split(':').map(Number)
      const reminderTime = new Date()
      reminderTime.setHours(hours, minutes, 0, 0)
      
      // Если время напоминания уже прошло сегодня, берем завтра
      if (reminderTime < now) {
        reminderTime.setDate(reminderTime.getDate() + 1)
      }

      const diff = reminderTime.getTime() - now.getTime()
      const diffMinutes = Math.floor(diff / (1000 * 60))
      
      // Показываем таймер только в последние 30 минут
      if (diffMinutes <= 30 && diffMinutes > 0) {
        setTimeUntilReminder(diffMinutes)
      } else {
        setTimeUntilReminder(null)
      }
    }

    calculateTimeUntilReminder()
    const interval = setInterval(calculateTimeUntilReminder, 1000 * 60) // Обновляем каждую минуту

    return () => clearInterval(interval)
  }, [habit.reminderTime, habit.reminderEnabled, habit.isCompletedToday])

  const streakStage = getStreakStage(habit.streak)

  return (
    <div className={`group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-[28px] shadow-lg hover:shadow-xl transition-all duration-300 border ${
      habit.isCompletedToday 
        ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10' 
        : 'border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700'
    }`}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className={`relative w-12 h-12 rounded-[16px] flex-shrink-0 transition-all duration-300 transform hover:scale-110 ${
              habit.isCompletedToday
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50'
                : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-800/30 border-2 border-gray-200 dark:border-gray-600'
            } ${isCompleting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {habit.isCompletedToday && (
              <svg
                className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-lg mb-1 transition-all ${
              habit.isCompletedToday 
                ? 'line-through text-gray-400 dark:text-gray-500' 
                : 'text-gray-800 dark:text-gray-200'
            }`}>
              {habit.name}
            </h3>
            {habit.description && (
              <p className={`text-sm mb-3 ${
                habit.isCompletedToday 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {habit.description}
              </p>
            )}

            {/* Напоминание - показываем только для Premium или если уже установлено */}
            {isPremium && (habit.reminderTime || isEditingReminder) && (
              <div className="mb-2 p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-[14px] border border-blue-100 dark:border-blue-800">
                {!isEditingReminder ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⏰</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {habit.reminderEnabled 
                            ? `Напоминание в ${formatTime(habit.reminderTime)}`
                            : 'Напоминание отключено'
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsEditingReminder(true)
                        setReminderTime(habit.reminderTime || '09:00')
                        setReminderEnabled(habit.reminderEnabled ?? true)
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium px-3 py-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-[12px] transition-all"
                    >
                      Изменить
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <span>⏰</span>
                        <span>Включить напоминание</span>
                      </label>
                      <label className={`relative inline-flex items-center ${isPremium ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                        <input
                          type="checkbox"
                          checked={reminderEnabled && isPremium}
                          disabled={!isPremium}
                          onChange={(e) => {
                            if (isPremium) {
                              setReminderEnabled(e.target.checked)
                            } else if (onScrollToSubscription) {
                              onScrollToSubscription()
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-indigo-600"></div>
                      </label>
                    </div>
                    {!isPremium && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        💎 Напоминания доступны только с Premium подпиской
                      </p>
                    )}
                    {reminderEnabled && (
                      <div>
                        <label htmlFor={`reminder-${habit.id}`} className="block text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">
                          Время
                        </label>
                        <input
                          id={`reminder-${habit.id}`}
                          type="time"
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all text-sm"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateReminder}
                        disabled={isUpdatingReminder}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-semibold py-2 px-4 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdatingReminder ? 'Сохранение...' : 'Сохранить'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingReminder(false)
                          setReminderTime(habit.reminderTime || '09:00')
                          setReminderEnabled(habit.reminderEnabled ?? true)
                        }}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Streak Badge */}
              {streakStage.showBadge ? (
                <div className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${streakStage.gradient} rounded-full`}>
                  {streakStage.emoji && <span className="text-base">{streakStage.emoji}</span>}
                  <div className="flex flex-col">
                    <span className={`text-xs font-semibold ${streakStage.textColor}`}>
                      {streakStage.label}
                    </span>
                    <span className={`text-sm font-bold ${streakStage.textColor}`}>
                      {habit.streak} {habit.streak === 1 ? 'день' : habit.streak < 5 ? 'дня' : 'дней'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-full border border-gray-200 dark:border-gray-600">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {streakStage.label}
                  </span>
                </div>
              )}

              {/* Таймер обратного отсчета */}
              {timeUntilReminder !== null && !habit.isCompletedToday && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">
                  <span className="text-base">⏱️</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      До напоминания
                    </span>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                      {timeUntilReminder} мин
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                {!habit.reminderTime && !isEditingReminder && (
                  <button
                    onClick={() => {
                      setIsEditingReminder(true)
                      setReminderTime('09:00')
                      setReminderEnabled(true)
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-[12px] transition-all"
                  >
                    <span className="text-sm">⏰</span>
                    <span>Напоминание</span>
                  </button>
                )}
                
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-4 py-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[12px] transition-all disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Удаление...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Удалить</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HabitItem
