import React, { useState } from 'react'
import { habitsApi } from '../services/api'
import { CreateHabitDto } from '../types'

interface AddHabitFormProps {
  onSuccess: () => void
}

const AddHabitForm: React.FC<AddHabitFormProps> = ({ onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateHabitDto>({
    name: '',
    description: '',
    reminderEnabled: true
  })
  const [reminderTime, setReminderTime] = useState('09:00')
  const [error, setError] = useState('')

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
      onSuccess()
    } catch (error: any) {
      console.error('Error creating habit:', error)
      setError(
        error.response?.data?.errors?.[0]?.msg ||
        error.response?.data?.error ||
        'Ошибка при создании привычки'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="group w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-5 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] mb-6 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Добавить привычку</span>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-[32px] shadow-xl p-6 mb-6 border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 mb-6">
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

      <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-[20px] border border-blue-100 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[16px] flex items-center justify-center">
            <span className="text-xl">⏰</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-0.5">Напоминание</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Получайте уведомления в Telegram</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.reminderEnabled ?? true}
              onChange={(e) => setFormData({ ...formData, reminderEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-indigo-600"></div>
          </label>
        </div>
        
        {formData.reminderEnabled && (
          <div className="mt-4">
            <label htmlFor="reminderTime" className="block text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Время напоминания
            </label>
            <input
              id="reminderTime"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all"
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
