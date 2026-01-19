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
    <div className={`group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border ${
      habit.isCompletedToday 
        ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10' 
        : 'border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700'
    }`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className={`relative w-10 h-10 rounded-xl flex-shrink-0 transition-all duration-300 transform hover:scale-110 ${
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
            
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-full">
                <span className="text-base">🔥</span>
                <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
                  {habit.streak} {habit.streak === 1 ? 'день' : habit.streak < 5 ? 'дня' : 'дней'}
                </span>
              </div>
              
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50"
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
  )
}

export default HabitItem
