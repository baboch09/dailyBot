import React, { useState } from 'react'
import { Habit } from '../types'
import { habitsApi } from '../services/api'

interface HabitItemProps {
  habit: Habit
  onUpdate: () => void
  onDelete: (id: string) => void
}

const HabitItem: React.FC<HabitItemProps> = ({ habit, onUpdate, onDelete }) => {
  const [isCompleting, setIsCompleting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await habitsApi.completeToday(habit.id)
      onUpdate()
    } catch (error) {
      console.error('Error completing habit:', error)
      alert('Ошибка при отметке привычки')
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
      onDelete(habit.id)
    } catch (error) {
      console.error('Error deleting habit:', error)
      alert('Ошибка при удалении привычки')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all ${
                habit.isCompletedToday
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 hover:border-green-400'
              } ${isCompleting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {habit.isCompletedToday && (
                <svg
                  className="w-full h-full text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
            <div className="flex-1">
              <h3 className={`font-semibold text-lg ${habit.isCompletedToday ? 'line-through text-gray-500' : ''}`}>
                {habit.name}
              </h3>
              {habit.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {habit.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 ml-9">
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">🔥</span>
              <span className="text-sm font-medium">{habit.streak} дней</span>
            </div>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50"
            >
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HabitItem
