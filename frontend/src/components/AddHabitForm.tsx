import React, { useState, useRef, useEffect } from 'react'
import { habitsApi, subscriptionApi } from '../services/api'
import { CreateHabitDto, SubscriptionStatus } from '../types'

interface AddHabitFormProps {
  onSuccess: () => void
  habitsCount?: number
  onScrollToSubscription?: () => void
}

const AddHabitForm: React.FC<AddHabitFormProps> = ({ onSuccess, habitsCount: propsHabitsCount = 0, onScrollToSubscription }) => {
  const [isOpen, setIsOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const subscriptionRef = useRef<HTMLDivElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateHabitDto>({
    name: '',
    description: '',
    reminderEnabled: false // По умолчанию выключено, т.к. только для Premium
  })
  const [reminderTime, setReminderTime] = useState('09:00')
  const [error, setError] = useState('')
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [habitsCount, setHabitsCount] = useState(propsHabitsCount)

  useEffect(() => {
    loadSubscriptionStatus()
  }, [])

  useEffect(() => {
    // Обновляем количество привычек из пропсов
    setHabitsCount(propsHabitsCount)
  }, [propsHabitsCount])

  const loadSubscriptionStatus = async () => {
    try {
      const status = await subscriptionApi.getStatus()
      setSubscriptionStatus(status)
    } catch (error) {
      console.error('Error loading subscription status:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Название привычки обязательно')
      return
    }

    setIsSubmitting(true)
    try {
      await habitsApi.create({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        reminderTime: formData.reminderEnabled ? reminderTime : null,
        reminderEnabled: formData.reminderEnabled
      })
      setFormData({ name: '', description: '', reminderEnabled: true })
      setReminderTime('09:00')
      setIsOpen(false)
      setError('')
      await loadSubscriptionStatus() // Обновляем статус после создания
      onSuccess() // Это обновит habits в App.tsx, который передаст новое количество через пропсы
    } catch (error: any) {
      console.error('Error creating habit:', error)
      
      // Обработка ошибки лимита Free плана
      if (error.response?.status === 403 && error.response?.data?.upgradeRequired) {
        setError(error.response.data.message || 'Достигнут лимит бесплатного плана')
        setIsOpen(false)
        // Скроллим к подписке
        if (onScrollToSubscription) {
          onScrollToSubscription()
        } else {
          setTimeout(() => {
            subscriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 300)
        }
      } else {
        setError(
          error.response?.data?.errors?.[0]?.msg ||
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Ошибка при создании привычки'
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (isOpen && formRef.current) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [isOpen])

  // Проверяем, достигнут ли лимит
  const now = new Date()
  const isPremium = 
    subscriptionStatus?.subscriptionStatus === 'active' && 
    subscriptionStatus.subscriptionExpiresAt &&
    new Date(subscriptionStatus.subscriptionExpiresAt) > now &&
    (subscriptionStatus.daysRemaining || 0) > 0
  
  const FREE_HABITS_LIMIT = 3
  const isLimitReached = !isPremium && habitsCount >= FREE_HABITS_LIMIT

  const handleButtonClick = () => {
    if (isLimitReached) {
      // Скроллим к кнопке обновить в подписке
      if (onScrollToSubscription) {
        onScrollToSubscription()
      } else {
        subscriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      return
    }
    setIsOpen(true)
  }

  if (!isOpen) {
    return (
      <>
        <div ref={subscriptionRef}></div>
        <button
          onClick={handleButtonClick}
          className={`group w-full font-bold py-4 px-6 rounded-full shadow-lg transition-all duration-300 transform mb-4 flex items-center justify-center gap-2 ${
            isLimitReached
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white hover:shadow-xl hover:scale-[1.02]'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white hover:shadow-xl hover:scale-[1.02]'
          }`}
        >
          {isLimitReached ? (
            <>
              <span>💎</span>
              <span>Обновите план до Премиум</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Добавить привычку</span>
            </>
          )}
        </button>
      </>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-[28px] shadow-xl p-5 mb-4 border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[20px] flex items-center justify-center">
          <span className="text-xl">➕</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Новая привычка</h2>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-[20px]">
          <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="mb-5">
        <label htmlFor="name" className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Название <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-5 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all"
          placeholder="Например: Пить воду утром"
          required
          maxLength={100}
        />
      </div>

      <div className="mb-6">
        <label htmlFor="description" className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Описание <span className="text-gray-400 text-xs">(необязательно)</span>
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-5 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all resize-none"
          placeholder="Добавьте описание вашей привычки..."
          rows={3}
          maxLength={500}
        />
      </div>

      <div className={`mb-4 p-3 rounded-[16px] border ${
        isPremium 
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800'
          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-75'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⏰</span>
          <div className="flex-1">
            <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">Напоминание</h3>
            {!isPremium && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                💎 Доступно только с Premium подпиской
              </p>
            )}
          </div>
          <label className={`relative inline-flex items-center ${!isPremium ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={!!(formData.reminderEnabled && isPremium)}
              disabled={!isPremium}
              onChange={(e) => {
                if (isPremium) {
                  setFormData({ ...formData, reminderEnabled: e.target.checked })
                } else if (onScrollToSubscription) {
                  // Если попытались включить без Premium, скроллим к подписке
                  onScrollToSubscription()
                }
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-indigo-600"></div>
          </label>
        </div>
        
        {formData.reminderEnabled && isPremium && (
          <div className="mt-2">
            <input
              id="reminderTime"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all text-sm"
            />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3.5 px-6 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Создание...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Создать</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false)
            setFormData({ name: '', description: '', reminderEnabled: true })
            setReminderTime('09:00')
            setError('')
          }}
          className="px-6 py-3.5 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all font-medium text-gray-700 dark:text-gray-300"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}

export default AddHabitForm
