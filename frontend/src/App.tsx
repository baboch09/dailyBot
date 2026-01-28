import { useState, useEffect, useRef } from 'react'
import { track } from '@vercel/analytics'
import { getWebApp } from './utils/telegram'
import { Habit, SubscriptionStatus } from './types'
import { habitsApi, subscriptionApi } from './services/api'
import HabitItem from './components/HabitItem'
import AddHabitForm from './components/AddHabitForm'
import SubscriptionManager from './components/SubscriptionManager'

function App() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const subscriptionRef = useRef<HTMLDivElement>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [subscriptionRefreshing, setSubscriptionRefreshing] = useState(false)

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
    loadSubscriptionStatus()
    
    // Обработка редиректа после оплаты
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')
    const paymentReturn = urlParams.get('payment_return')
    
    if (paymentStatus === 'success' || paymentReturn === 'true') {
      // Убираем параметр из URL сразу
      window.history.replaceState({}, '', window.location.pathname)
      
      // Проверяем статус последнего платежа и активируем подписку если нужно
      const checkAndActivateSubscription = async () => {
        try {
          // Пока проверяем/дожидаемся статуса платежа, показываем скелетон на карточке подписки
          setSubscriptionRefreshing(true)

          // Проверяем статус последнего платежа
          const paymentStatus = await subscriptionApi.checkLatestPaymentStatus()
          
          if (paymentStatus.hasPayment && paymentStatus.status === 'succeeded') {
            // Платеж успешен - обновляем статус подписки
            await loadSubscriptionStatus()
            
            // Аналитика: успешная оплата
            const planType = sessionStorage.getItem('pending_payment_plan') || 'unknown'
            track('payment_completed', {
              planType: planType
            })
            sessionStorage.removeItem('pending_payment_plan')
            
            alert('🎉 Платеж успешно обработан! Ваша подписка активирована.')
            // Перезагружаем страницу для полного обновления состояния
            window.location.reload()
          } else if (paymentStatus.hasPayment && paymentStatus.status === 'pending') {
            // Платеж еще обрабатывается - ждем и проверяем снова
            setTimeout(async () => {
              const retryStatus = await subscriptionApi.checkLatestPaymentStatus()
              if (retryStatus.status === 'succeeded') {
                await loadSubscriptionStatus()
                
                // Аналитика: успешная оплата
                const planType = sessionStorage.getItem('pending_payment_plan') || 'unknown'
                track('payment_completed', {
                  planType: planType
                })
                sessionStorage.removeItem('pending_payment_plan')
                
                alert('🎉 Платеж успешно обработан! Ваша подписка активирована.')
                window.location.reload()
              } else {
                // Если все еще pending, обновляем статус и показываем сообщение
                await loadSubscriptionStatus()
                alert('⏳ Платеж обрабатывается. Подписка будет активирована автоматически после подтверждения.')
              }
              setSubscriptionRefreshing(false)
            }, 2000)
          } else {
            // Платеж не найден или отменен
            await loadSubscriptionStatus()
            alert('⚠️ Не удалось найти информацию о платеже. Пожалуйста, проверьте статус подписки.')
            setSubscriptionRefreshing(false)
          }
        } catch (error) {
          console.error('Error checking payment status:', error)
          // В случае ошибки просто обновляем статус подписки
          await loadSubscriptionStatus()
          alert('⏳ Проверяем статус платежа. Если оплата прошла успешно, подписка будет активирована автоматически.')
          setSubscriptionRefreshing(false)
        }
      }
      
      // Запускаем проверку с небольшой задержкой для обработки webhook
      setTimeout(async () => {
        await checkAndActivateSubscription()
        // На случай, если в checkAndActivateSubscription не дошли до снятия флага
        setSubscriptionRefreshing(false)
      }, 1000)
    } else if (paymentStatus === 'fail') {
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => {
        alert('❌ Ошибка при обработке платежа. Попробуйте еще раз.')
      }, 500)
    }
  }, [])

  const loadSubscriptionStatus = async () => {
    try {
      const status = await subscriptionApi.getStatus()
      setSubscriptionStatus(status)
    } catch (error) {
      console.error('Error loading subscription status:', error)
    }
  }

  const handleHabitUpdate = () => {
    loadHabits()
  }

  const handleHabitComplete = (habitId: string, completed: boolean, streak?: number) => {
    console.log(`🔄 Updating habit ${habitId}:`, { completed, streak, previousStreak: habits.find(h => h.id === habitId)?.streak })
    
    // Обновляем только конкретную привычку без перезагрузки всего списка
    // Используем streak из ответа сервера, так как он уже пересчитан
    setHabits(prevHabits => prevHabits.map(h => {
      if (h.id === habitId) {
        const updatedHabit = { 
          ...h, 
          isCompletedToday: completed,
          streak: streak !== undefined ? streak : h.streak // Используем streak из ответа, если передан
        }
        console.log(`✅ Updated habit ${habitId} in state:`, { 
          oldStreak: h.streak, 
          newStreak: updatedHabit.streak,
          completed: updatedHabit.isCompletedToday 
        })
        return updatedHabit
      }
      return h
    }))
    
    // НЕ вызываем getAll() сразу, так как он может перезаписать обновленный streak
    // Вместо этого полагаемся на streak из ответа сервера
    // Если нужна полная синхронизация, можно вызвать getAll() позже (например, через 2-3 секунды)
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
                {(() => {
                  const isPremium = subscriptionStatus?.subscriptionStatus === 'active' && 
                                   subscriptionStatus?.subscriptionExpiresAt && 
                                   new Date(subscriptionStatus.subscriptionExpiresAt) > new Date() &&
                                   (subscriptionStatus?.daysRemaining || 0) > 0
                  return isPremium ? ' из ∞' : ` из 3`
                })()}
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

        <div ref={subscriptionRef}>
          <SubscriptionManager externalLoading={subscriptionRefreshing} />
        </div>

        <AddHabitForm 
          onSuccess={handleHabitUpdate}
          habitsCount={habits.length}
          onScrollToSubscription={() => {
            subscriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        />

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
                onComplete={handleHabitComplete}
                onDelete={handleHabitDelete}
                isPremium={!!(subscriptionStatus?.subscriptionStatus === 'active' && 
                          subscriptionStatus?.subscriptionExpiresAt && 
                          new Date(subscriptionStatus.subscriptionExpiresAt) > new Date() &&
                          (subscriptionStatus?.daysRemaining || 0) > 0)}
                onScrollToSubscription={() => {
                  setTimeout(() => {
                    const updateButton = document.querySelector('[data-update-subscription-button]')
                    if (updateButton) {
                      updateButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    } else {
                      subscriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  }, 100)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
