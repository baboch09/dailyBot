import { useState, useEffect } from 'react'
import { getWebApp } from './utils/telegram'
import { Habit } from './types'
import { habitsApi } from './services/api'
import HabitItem from './components/HabitItem'
import AddHabitForm from './components/AddHabitForm'
import SubscriptionManager from './components/SubscriptionManager'

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
      
      // Проверяем, что приложение открыто через Telegram
      const webApp = getWebApp()
      if (!webApp) {
        setError('Приложение должно быть открыто через Telegram. Пожалуйста, откройте его через бота.')
        setLoading(false)
        return
      }
      
      const data = await habitsApi.getAll()
      setHabits(data)
    } catch (error: any) {
      console.error('Error loading habits:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message
      
      if (errorMessage?.includes('Telegram ID') || errorMessage?.includes('telegram')) {
        setError('Ошибка аутентификации. Убедитесь, что вы открыли приложение через Telegram бота.')
      } else {
        setError(errorMessage || 'Ошибка при загрузке привычек. Убедитесь, что вы открыли приложение через Telegram.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHabits()
    
    // Обработка редиректа после оплаты
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')
    if (paymentStatus === 'success') {
      // Показываем уведомление об успешной оплате
      setTimeout(() => {
        alert('🎉 Платеж успешно обработан! Ваша подписка активирована.')
        // Убираем параметр из URL
        window.history.replaceState({}, '', window.location.pathname)
      }, 500)
    } else if (paymentStatus === 'fail') {
      setTimeout(() => {
        alert('❌ Ошибка при обработке платежа. Попробуйте еще раз.')
        window.history.replaceState({}, '', window.location.pathname)
      }, 500)
    }
  }, [])

  const handleHabitUpdate = () => {
    loadHabits()
  }

  const handleHabitDelete = (id: string) => {
    setHabits(habits.filter(h => h.id !== id))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 pb-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6 text-center pt-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[28px] mb-4 shadow-lg">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Трекер привычек
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Отслеживайте свои ежедневные привычки и достигайте целей
          </p>
          {habits.length > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-full shadow-sm">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Всего привычек: <span className="font-bold text-blue-600">{habits.length}</span>
              </span>
            </div>
          )}
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-[20px] shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
            </div>
          </div>
        )}

        <SubscriptionManager />

        <AddHabitForm onSuccess={handleHabitUpdate} />

        {habits.length === 0 ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-[32px] shadow-xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              Начните свой путь к успеху
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-1">
              У вас пока нет привычек
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Добавьте свою первую привычку, чтобы начать отслеживать прогресс
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
