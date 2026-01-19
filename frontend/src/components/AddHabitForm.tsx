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
    description: ''
  })
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
        description: formData.description?.trim() || undefined
      })
      setFormData({ name: '', description: '' })
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
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors mb-4"
      >
        Добавить привычку
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
      <h2 className="text-xl font-semibold mb-4">Новая привычка</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Название *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Например: Пить воду"
          required
          maxLength={100}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium mb-2">
          Описание (необязательно)
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Добавьте описание..."
          rows={3}
          maxLength={500}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Создание...' : 'Создать'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false)
            setFormData({ name: '', description: '' })
            setError('')
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}

export default AddHabitForm
