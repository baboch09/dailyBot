import { useState, useEffect } from 'react'
import { getWebApp } from './utils/telegram'
import { Habit } from './types'
import { habitsApi } from './services/api'
import HabitItem from './components/HabitItem'
import AddHabitForm from './components/AddHabitForm'

function App() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Инициализация Telegram WebApp
  useEffect(() => {
    try {
      const webApp = getWebApp()
      if (webApp) {
        webApp.ready()
        webApp.expand()

        // Настраиваем тему Telegram
        document.documentElement.style.setProperty(
          '--tg-theme-bg-color',
          webApp.themeParams.bg_color || '#ffffff'
        )
        document.documentElement.style.setProperty(
          '--tg-theme-text-color',
          webApp.themeParams.text_color || '#000000'
        )
      }
    } catch (error) {
      console.error('Error initializing WebApp:', error)
    }
  }, [])

  // Загрузка привычек
  const loadHabits = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await habitsApi.getAll()
      setHabits(data)
    } catch (error: any) {
      console.error('Error loading habits:', error)
      setError(
        error.response?.data?.error ||
        'Ошибка при загрузке привычек. Убедитесь, что вы открыли приложение через Telegram.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHabits()
  }, [])

  const handleHabitUpdate = () => {
    loadHabits()
  }

  const handleHabitDelete = (id: string) => {
    setHabits(habits.filter(h => h.id !== id))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Трекер привычек</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Отслеживайте свои ежедневные привычки
          </p>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <AddHabitForm onSuccess={handleHabitUpdate} />

        {habits.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              У вас пока нет привычек
            </p>
            <p className="text-sm text-gray-500">
              Добавьте свою первую привычку, чтобы начать отслеживать прогресс
            </p>
          </div>
        ) : (
          <div>
            {habits.map((habit) => (
              <HabitItem
                key={habit.id}
                habit={habit}
                onUpdate={handleHabitUpdate}
                onDelete={handleHabitDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
