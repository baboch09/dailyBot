import { useState, useEffect, useRef } from 'react'
import { track } from '@vercel/analytics'
import { getWebApp } from './utils/telegram'
import { Habit, SubscriptionStatus as SubscriptionStatusType } from './types'
import { habitsApi, subscriptionApi } from './services/api'
import HabitItem from './components/HabitItem'
import AddHabitForm from './components/AddHabitForm'
import SubscriptionManager from './components/SubscriptionManager'
import MoreTab from './components/MoreTab'

type AppTab = 'habits' | 'more'

function App() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<AppTab>('habits')
  const subscriptionRef = useRef<HTMLDivElement>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusType | null>(null)
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

    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatusParam = urlParams.get('payment')
    const paymentReturn = urlParams.get('payment_return')
    const paymentInitiated = localStorage.getItem('payment_initiated')
    const initiatedTime = paymentInitiated ? parseInt(paymentInitiated, 10) : 0
    const isReturnFromPayment =
      paymentStatusParam === 'success' ||
      paymentReturn === 'true' ||
      (paymentInitiated && Date.now() - initiatedTime < 30 * 60 * 1000)

    // Сбрасываем скелетон при каждом заходе, если не в сценарии «возврат с оплаты» — чтобы не зависнуть после прошлого раза
    if (!isReturnFromPayment) {
      setSubscriptionRefreshing(false)
      return
    }

    if (paymentStatusParam === 'fail') {
      window.history.replaceState({}, '', window.location.pathname)
      localStorage.removeItem('payment_initiated')
      setTimeout(() => {
        alert('❌ Ошибка при обработке платежа. Попробуйте еще раз.')
      }, 500)
      return
    }

    if (paymentStatusParam === 'success' || paymentReturn === 'true') {
      window.history.replaceState({}, '', window.location.pathname)
    }

    const PAYMENT_POLL_INTERVAL_MS = 2000
    const PAYMENT_POLL_ATTEMPTS = 15
    const STATUS_POLL_INTERVAL_MS = 2000
    const STATUS_POLL_ATTEMPTS = 6
    const SAFETY_TIMEOUT_MS = 25000

    const clearRefresh = () => setSubscriptionRefreshing(false)
    const doneWithPayment = () => {
      localStorage.removeItem('payment_initiated')
      sessionStorage.removeItem('pending_payment_plan')
    }

    const checkAndActivateSubscription = async () => {
      setSubscriptionRefreshing(true)
      const safetyTimeout = setTimeout(clearRefresh, SAFETY_TIMEOUT_MS)

      try {
        let latest = await subscriptionApi.checkLatestPaymentStatus()

        if (latest.hasPayment && latest.status === 'pending') {
          for (let i = 0; i < PAYMENT_POLL_ATTEMPTS; i++) {
            await new Promise((r) => setTimeout(r, PAYMENT_POLL_INTERVAL_MS))
            latest = await subscriptionApi.checkLatestPaymentStatus()
            if (latest.hasPayment && latest.status === 'succeeded') break
            if (latest.hasPayment && latest.status === 'canceled') {
              doneWithPayment()
              await loadSubscriptionStatus()
              alert('Платеж отменён.')
              clearRefresh()
              clearTimeout(safetyTimeout)
              return
            }
          }
        }

        if (!latest.hasPayment || latest.status !== 'succeeded') {
          doneWithPayment()
          await loadSubscriptionStatus()
          clearRefresh()
          clearTimeout(safetyTimeout)
          if (latest.hasPayment && latest.status === 'pending') {
            alert('⏳ Платеж обрабатывается. Подписка появится в течение минуты. Закройте приложение и зайдите снова.')
          } else {
            alert('⚠️ Не удалось найти информацию о платеже. Проверьте статус подписки или зайдите позже.')
          }
          return
        }

        // Дожидаемся, пока бэкенд покажет активную подписку
        let status = await subscriptionApi.getStatus()
        const isActive = (s: typeof status) =>
          s?.subscriptionStatus === 'active' && (s?.daysRemaining ?? 0) > 0
        for (let i = 0; i < STATUS_POLL_ATTEMPTS && !isActive(status); i++) {
          await new Promise((r) => setTimeout(r, STATUS_POLL_INTERVAL_MS))
          status = await subscriptionApi.getStatus()
        }

        clearRefresh()
        clearTimeout(safetyTimeout)

        if (!isActive(status)) {
          doneWithPayment()
          await loadSubscriptionStatus()
          alert('⏳ Подписка активируется в течение минуты. Закройте приложение и зайдите снова — тариф обновится.')
          return
        }

        const planType = sessionStorage.getItem('pending_payment_plan') || 'unknown'
        doneWithPayment()
        setSubscriptionStatus(status)
        track('payment_completed', { planType })

        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert('🎉 Платеж успешно обработан! Ваша подписка активирована.')
        } else {
          alert('🎉 Платеж успешно обработан! Ваша подписка активирована.')
        }
        window.location.reload()
      } catch (error) {
        console.error('Error checking payment status:', error)
        doneWithPayment()
        await loadSubscriptionStatus()
        clearRefresh()
        clearTimeout(safetyTimeout)
        alert('⏳ Не удалось проверить платёж. Если оплата прошла, зайдите в приложение ещё раз — подписка подтянется.')
      } finally {
        clearTimeout(safetyTimeout)
        setSubscriptionRefreshing(false)
      }
    }

    const delayMs = paymentInitiated && !paymentStatusParam && !paymentReturn ? 800 : 1000
    const t = setTimeout(() => {
      checkAndActivateSubscription()
    }, delayMs)
    return () => {
      clearTimeout(t)
      setSubscriptionRefreshing(false)
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

  const isPremium = !!(
    subscriptionStatus?.subscriptionStatus === 'active' &&
    subscriptionStatus?.subscriptionExpiresAt &&
    new Date(subscriptionStatus.subscriptionExpiresAt) > new Date() &&
    (subscriptionStatus?.daysRemaining ?? 0) > 0
  )
  const habitsLimitLabel = isPremium ? '∞' : '3'
  const habitsCountLabel = `Привычек: ${habits.length} из ${habitsLimitLabel}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {activeTab === 'habits' && (
          <>
            {/* Верхний блок: иконка, заголовок, подзаголовок */}
            <header className="mb-6 text-center pt-2 sm:pt-4">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] sm:rounded-[28px] mb-3 sm:mb-4 shadow-lg ring-2 ring-white/20 dark:ring-gray-800/50 overflow-hidden bg-white">
                <img
                  src="/app-icon.png"
                  alt=""
                  className="w-full h-full object-cover"
                  width={80}
                  height={80}
                />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-1.5 sm:mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                Трекер привычек
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg max-w-md mx-auto px-2">
                Каждый день — шаг к лучшей версии себя
              </p>
              {/* Счётчик привычек с визуальным акцентом */}
              <div className="mt-4 inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-md border border-gray-200/60 dark:border-gray-700/60">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {habitsCountLabel}
                </span>
              </div>
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
                    isPremium={isPremium}
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
          </>
        )}

        {activeTab === 'more' && (
          <MoreTab
            isPremium={isPremium}
            onUpgradeClick={() => {
              setActiveTab('habits')
              setTimeout(() => {
                subscriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 150)
            }}
          />
        )}
      </div>

      {/* Нижняя навигация */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveTab('habits')}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              activeTab === 'habits'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span className="text-xl" aria-hidden>✨</span>
            <span className="text-xs font-medium">Привычки</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('more')}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              activeTab === 'more'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span className="text-xl" aria-hidden>⋯</span>
            <span className="text-xs font-medium">Ещё</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default App
