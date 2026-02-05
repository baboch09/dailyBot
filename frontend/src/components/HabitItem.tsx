import React, { useState, useEffect } from 'react'
import { track } from '@vercel/analytics'
import { Habit } from '../types'
import { habitsApi } from '../services/api'
import ReminderBottomSheet, { type ReminderMode } from './ReminderBottomSheet'

interface HabitItemProps {
  habit: Habit
  onUpdate: () => void
  onComplete?: (habitId: string, completed: boolean, streak?: number) => void
  onDelete?: (id: string) => void // Оставлено для обратной совместимости, но не используется
  isPremium?: boolean
  onScrollToSubscription?: () => void
}

const HabitItem: React.FC<HabitItemProps> = ({ habit, onUpdate, onComplete, isPremium = false, onScrollToSubscription }) => {
  const [isCompleting, setIsCompleting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false)
  const [reminderMode, setReminderMode] = useState<ReminderMode>('daily')
  const [reminderTime, setReminderTime] = useState(habit.reminderTime || '09:00')
  const [reminderEnabled, setReminderEnabled] = useState(habit.reminderEnabled ?? false)
  const [isUpdatingReminder, setIsUpdatingReminder] = useState(false)
  const [isEditingHabit, setIsEditingHabit] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [editingName, setEditingName] = useState(habit.name)
  const [editingDescription, setEditingDescription] = useState(habit.description || '')
  const [editingGoalEnabled, setEditingGoalEnabled] = useState(habit.goalEnabled ?? false)
  const [editingGoalType, setEditingGoalType] = useState<'streak' | 'count' | 'period'>((habit.goalType as 'streak' | 'count' | 'period') || 'streak')
  const [editingGoalTarget, setEditingGoalTarget] = useState(habit.goalTarget ?? 21)
  const [editingGoalPeriodDays, setEditingGoalPeriodDays] = useState(habit.goalPeriodDays ?? 21)
  const [isUpdatingHabit, setIsUpdatingHabit] = useState(false)

  const handleComplete = async () => {
    // Не позволяем кликать повторно пока идет обработка
    if (isCompleting) {
      return
    }
    
    setIsCompleting(true)
    
    try {
      const result = await habitsApi.completeToday(habit.id)
      console.log(`✅ Habit ${habit.id} completed:`, { 
        completed: result.completed, 
        streak: result.streak,
        previousStreak: habit.streak 
      })
      // Обновляем через колбэк, передавая и completed и streak
      if (onComplete) {
        onComplete(habit.id, result.completed, result.streak)
      }
    } catch (error: any) {
      console.error('Error completing habit:', error)
      
      // Если ошибка retryable, предлагаем повторить
      if (error.response?.status === 503 && error.response?.data?.retryable) {
        if (confirm('Ошибка подключения к базе данных. Попробовать ещё раз?')) {
          setTimeout(() => handleComplete(), 1000)
          return
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
      const previousReminderEnabled = habit.reminderEnabled ?? false
      await habitsApi.update(habit.id, {
        reminderTime: reminderEnabled ? reminderTime : null,
        reminderEnabled: reminderEnabled
      })
      if (reminderEnabled && !previousReminderEnabled && isPremium) {
        track('reminder_installed', { isPremium: true })
      } else if (!reminderEnabled && previousReminderEnabled) {
        track('reminder_deleted', { isPremium: isPremium })
      }
      setReminderSheetOpen(false)
      onUpdate()
    } catch (error: any) {
      console.error('Error updating reminder:', error)
      if (error.response?.status === 403 && error.response?.data?.upgradeRequired) {
        setReminderSheetOpen(false)
        if (onScrollToSubscription) onScrollToSubscription()
        alert('Напоминания доступны только с Premium подпиской')
      } else {
        alert('Ошибка при обновлении напоминания')
      }
    } finally {
      setIsUpdatingReminder(false)
    }
  }

  const openReminderSheet = () => {
    setReminderTime(habit.reminderTime || '09:00')
    setReminderEnabled(habit.reminderEnabled ?? false)
    setReminderSheetOpen(true)
    setShowMenu(false)
  }

  const handleUpdateHabit = async () => {
    if (!editingName.trim()) {
      alert('Название привычки обязательно')
      return
    }

    setIsUpdatingHabit(true)
    try {
      await habitsApi.update(habit.id, {
        name: editingName.trim(),
        description: editingDescription.trim() || undefined,
        goalEnabled: isPremium ? editingGoalEnabled : false,
        goalType: isPremium && editingGoalEnabled ? editingGoalType : undefined,
        goalTarget: isPremium && editingGoalEnabled ? editingGoalTarget : undefined,
        goalPeriodDays: isPremium && editingGoalEnabled ? editingGoalPeriodDays : undefined
      })
      setIsEditingHabit(false)
      setShowMenu(false)
      onUpdate()
    } catch (error: any) {
      console.error('Error updating habit:', error)
      if (error.response?.status === 403 && error.response?.data?.upgradeRequired && onScrollToSubscription) {
        onScrollToSubscription()
      }
      alert(error.response?.data?.message || 'Ошибка при обновлении привычки')
    } finally {
      setIsUpdatingHabit(false)
    }
  }

  const formatTime = (time: string | null | undefined) => {
    if (!time) return null
    // Возвращаем время в 24-часовом формате (HH:MM)
    return time
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
    } else if (streak >= 1 && streak < 3) {
      return {
        emoji: '🌱',
        label: 'Это только начало',
        gradient: 'from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30',
        textColor: 'text-green-700 dark:text-green-300',
        showBadge: true
      }
    } else if (streak >= 3 && streak < 7) {
      return {
        emoji: '🌿',
        label: 'Набираешь обороты',
        gradient: 'from-green-100 to-emerald-200 dark:from-green-900/30 dark:to-emerald-900/30',
        textColor: 'text-green-700 dark:text-green-300',
        showBadge: true
      }
    } else if (streak >= 7 && streak < 14) {
      return {
        emoji: '🔥',
        label: 'Самое сложное позади',
        gradient: 'from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30',
        textColor: 'text-orange-700 dark:text-orange-300',
        showBadge: true
      }
    } else if (streak >= 14 && streak < 21) {
      return {
        emoji: '🔥',
        label: 'Ты просто зверь!',
        gradient: 'from-orange-100 to-red-200 dark:from-orange-900/30 dark:to-red-900/30',
        textColor: 'text-orange-700 dark:text-orange-300',
        showBadge: true
      }
    } else if (streak >= 21 && streak < 66) {
      return {
        emoji: '⚡',
        label: 'Сила воли твоё второе имя',
        gradient: 'from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30',
        textColor: 'text-blue-700 dark:text-blue-300',
        showBadge: true
      }
    } else if (streak >= 66 && streak < 100) {
      return {
        emoji: '⭐',
        label: 'Это уже не привычка, а так пустяк',
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
    if (!habit.reminderTime || !habit.reminderEnabled || habit.isCompletedToday || !isPremium) {
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
  }, [habit.reminderTime, habit.reminderEnabled, habit.isCompletedToday, isPremium])

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.habit-menu')) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const streakStage = getStreakStage(habit.streak)

  return (
    <div className={`group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-[28px] shadow-lg [@media(hover:hover)]:hover:shadow-xl transition-all duration-300 border ${
      habit.isCompletedToday 
        ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10' 
        : 'border-gray-100 dark:border-gray-700 [@media(hover:hover)]:hover:border-blue-200 [@media(hover:hover)]:dark:hover:border-blue-700'
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-4">
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className={`relative w-12 h-12 rounded-[16px] flex-shrink-0 transition-all duration-300 transform [@media(hover:hover)]:hover:scale-110 ${
              habit.isCompletedToday
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50'
                : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 [@media(hover:hover)]:hover:from-green-100 [@media(hover:hover)]:hover:to-green-200 [@media(hover:hover)]:dark:hover:from-green-900/30 [@media(hover:hover)]:dark:hover:to-green-800/30 border-2 border-gray-200 dark:border-gray-600'
            } ${isCompleting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {isCompleting ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : habit.isCompletedToday ? (
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
            ) : null}
          </button>
          
          <div className="flex-1 min-w-0">
            {isEditingHabit ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Название <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all text-sm"
                    placeholder="Название привычки"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">Описание</label>
                  <textarea
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all text-sm resize-none"
                    placeholder="Описание (необязательно)"
                    rows={2}
                    maxLength={500}
                  />
                </div>
                {isPremium && (
                  <div className="p-2.5 rounded-[14px] bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">🎯 Цель</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingGoalEnabled}
                          onChange={(e) => setEditingGoalEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:bg-amber-500 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                      </label>
                    </div>
                    {editingGoalEnabled && (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {(['streak', 'count', 'period'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEditingGoalType(t)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium ${
                              editingGoalType === t ? 'bg-amber-500 text-white' : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            {t === 'streak' ? 'Серия' : t === 'count' ? 'Кол-во' : 'Период'}
                          </button>
                        ))}
                        {editingGoalType === 'streak' && [21, 30, 90].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setEditingGoalTarget(n)}
                            className={`px-2 py-1.5 rounded-lg text-xs ${editingGoalTarget === n ? 'bg-amber-500 text-white' : 'bg-white dark:bg-gray-700 border'}`}
                          >
                            {n}
                          </button>
                        ))}
                        {(editingGoalType === 'count' || editingGoalType === 'period') && [21, 30, 90].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setEditingGoalPeriodDays(n)}
                            className={`px-2 py-1.5 rounded-lg text-xs ${editingGoalPeriodDays === n ? 'bg-amber-500 text-white' : 'bg-white dark:bg-gray-700 border'}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateHabit}
                    disabled={isUpdatingHabit}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 [@media(hover:hover)]:hover:from-blue-600 [@media(hover:hover)]:hover:to-indigo-700 text-white text-xs font-semibold py-2 px-4 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingHabit ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingHabit(false)
                      setEditingName(habit.name)
                      setEditingDescription(habit.description || '')
                      setEditingGoalEnabled(habit.goalEnabled ?? false)
                      setEditingGoalType((habit.goalType as 'streak' | 'count' | 'period') || 'streak')
                      setEditingGoalTarget(habit.goalTarget ?? 21)
                      setEditingGoalPeriodDays(habit.goalPeriodDays ?? 21)
                    }}
                    className="px-4 py-2 border-2 border-gray-200 dark:border-gray-700 [@media(hover:hover)]:hover:border-gray-300 [@media(hover:hover)]:dark:hover:border-gray-600 rounded-full [@media(hover:hover)]:hover:bg-gray-50 [@media(hover:hover)]:dark:hover:bg-gray-700/50 transition-all text-xs font-medium text-gray-700 dark:text-gray-300"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className={`font-bold text-lg transition-all flex-1 ${
                    habit.isCompletedToday 
                      ? 'line-through text-gray-400 dark:text-gray-500' 
                      : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    {habit.name}
                  </h3>
                  
                  {/* Меню настроек */}
                  <div className="relative habit-menu">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2 rounded-full [@media(hover:hover)]:hover:bg-gray-100 [@media(hover:hover)]:dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 [@media(hover:hover)]:hover:text-gray-700 [@media(hover:hover)]:dark:hover:text-gray-200 flex items-center"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>

                    {/* Выпадающее меню - открываем вверх, чтобы не перекрывалось следующей привычкой */}
                    {showMenu && (
                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-gray-800 rounded-[16px] shadow-xl border border-gray-200 dark:border-gray-700 z-[100] overflow-hidden">
                        <button
                          onClick={() => {
                            setIsEditingHabit(true)
                            setShowMenu(false)
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 [@media(hover:hover)]:hover:bg-gray-50 [@media(hover:hover)]:dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Редактировать
                        </button>
                        {isPremium && (
                          <button
                            onClick={openReminderSheet}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 [@media(hover:hover)]:hover:bg-gray-50 [@media(hover:hover)]:dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Напоминание
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowMenu(false)
                            handleDelete()
                          }}
                          disabled={isDeleting}
                          className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 [@media(hover:hover)]:hover:bg-red-50 [@media(hover:hover)]:dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {isDeleting ? 'Удаление...' : 'Удалить'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {habit.description && (
                  <p className={`text-sm mb-3 break-words ${
                    habit.isCompletedToday 
                      ? 'text-gray-400 dark:text-gray-500' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {habit.description}
                  </p>
                )}

                {/* Напоминание — только для Premium; по клику открывается bottom sheet */}
                {isPremium && (
                  <button
                    type="button"
                    onClick={openReminderSheet}
                    className="mb-2 w-full p-2.5 text-left bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-[14px] border border-blue-100 dark:border-blue-800 hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⏰</span>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {habit.reminderEnabled && habit.reminderTime
                          ? `Напоминание в ${formatTime(habit.reminderTime)}`
                          : 'Напоминание отключено'}
                      </p>
                    </div>
                  </button>
                )}

                <ReminderBottomSheet
                  isOpen={reminderSheetOpen}
                  onClose={() => setReminderSheetOpen(false)}
                  mode={reminderMode}
                  onModeChange={setReminderMode}
                  time={reminderTime}
                  onTimeChange={setReminderTime}
                  reminderEnabled={reminderEnabled}
                  onReminderEnabledChange={setReminderEnabled}
                  onSave={handleUpdateReminder}
                  isSaving={isUpdatingReminder}
                  isPremium={isPremium}
                  onRequestPro={onScrollToSubscription}
                />
              </>
            )}

            {/* Цель: превью прогресса (PRO) */}
            {habit.goalEnabled && habit.goalType === 'streak' && habit.goalTarget != null && (
              <div className="mb-2 p-2.5 rounded-[14px] bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  🎯 {habit.goalTarget} {habit.goalTarget === 1 ? 'день' : habit.goalTarget < 5 ? 'дня' : 'дней'} подряд — {Math.min(habit.streak, habit.goalTarget)}/{habit.goalTarget} выполнено
                </p>
                {habit.streak >= habit.goalTarget && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">✅ Цель достигнута!</p>
                )}
              </div>
            )}

            {/* Статистика и streak */}
            <div className="flex items-center gap-3 mt-3">
              {streakStage.showBadge && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${streakStage.gradient} border border-opacity-20`}>
                  <span className="text-xs">{streakStage.emoji}</span>
                  <span className={`text-xs font-semibold ${streakStage.textColor}`}>
                    {habit.streak} {habit.streak === 1 ? 'день' : habit.streak < 5 ? 'дня' : 'дней'}
                  </span>
                  <span className={`text-xs ${streakStage.textColor} opacity-75`}>
                    {streakStage.label}
                  </span>
                </div>
              )}
              
              {timeUntilReminder !== null && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-100 dark:border-orange-800">
                  <span className="text-xs">⏰</span>
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                    {timeUntilReminder} {timeUntilReminder === 1 ? 'минута' : timeUntilReminder < 5 ? 'минуты' : 'минут'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HabitItem
