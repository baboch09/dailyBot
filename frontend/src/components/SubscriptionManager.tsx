import { useState, useEffect } from 'react'
import SubscriptionPlans from './SubscriptionPlans'
import { subscriptionApi } from '../services/api'
import type { SubscriptionStatus as SubscriptionStatusType } from '../types'

interface SubscriptionManagerProps {
  externalLoading?: boolean
}

export default function SubscriptionManager({ externalLoading = false }: SubscriptionManagerProps) {
  const [showPlans, setShowPlans] = useState(false)
  const [status, setStatus] = useState<SubscriptionStatusType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStatus()
    
    // Проверяем различные способы возврата из оплаты:
    
    // 1. Через URL параметр (из payment-return.html)
    const urlParams = new URLSearchParams(window.location.search)
    const paymentReturn = urlParams.get('payment_return')
    
    // 2. Через startapp параметр (из Telegram deep link)
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param
    
    // 3. Через localStorage (из payment-return.html)
    const paymentReturnTime = localStorage.getItem('payment_return_time')
    const recentReturn = paymentReturnTime && 
                         (Date.now() - parseInt(paymentReturnTime) < 60000) // В течение 1 минуты
    
    if (paymentReturn === 'true' || startParam === 'payment_return' || recentReturn) {
      console.log('🔍 Detected return from payment, checking status...')
      if (paymentReturnTime) {
        localStorage.removeItem('payment_return_time')
      }
      // Убираем параметр из URL
      if (paymentReturn) {
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
    
    // Всегда проверяем, есть ли незавершенный платеж
    checkReturnFromPayment()
  }, [])

  const checkReturnFromPayment = async () => {
    // Используем localStorage вместо sessionStorage для сохранения между сессиями
    const paymentInitiated = localStorage.getItem('payment_initiated')
    if (!paymentInitiated) return

    const initiatedTime = parseInt(paymentInitiated)
    const now = Date.now()
    
    // Если платеж был инициирован недавно (в течение 30 минут)
    if (now - initiatedTime < 30 * 60 * 1000) {
      console.log('🔍 Checking payment status after return from payment...')
      
      try {
        // Проверяем статус последнего платежа
        const result = await subscriptionApi.checkLatestPaymentStatus()
        
        if (result.hasPayment && result.status === 'succeeded') {
          console.log('✅ Payment succeeded! Activating subscription...')
          
          // Очищаем метку
          localStorage.removeItem('payment_initiated')
          
          // Перезагружаем статус подписки
          await loadStatus()
          
          // Показываем уведомление (если есть Telegram WebApp API)
          if (window.Telegram?.WebApp?.showAlert) {
            window.Telegram.WebApp.showAlert('🎉 Подписка успешно активирована!')
          } else {
            alert('🎉 Подписка успешно активирована!')
          }
        } else if (result.hasPayment && result.status === 'pending') {
          console.log('⏳ Payment still pending, will check again later')
          // Показываем уведомление о том, что платеж обрабатывается
          if (window.Telegram?.WebApp?.showAlert) {
            window.Telegram.WebApp.showAlert('⏳ Платеж обрабатывается. Подождите немного.')
          }
        } else if (result.hasPayment && result.status === 'canceled') {
          console.log('❌ Payment was canceled')
          localStorage.removeItem('payment_initiated')
        }
      } catch (error) {
        console.error('Error checking payment status:', error)
      }
    } else {
      // Платеж был давно, удаляем метку
      localStorage.removeItem('payment_initiated')
    }
  }

  const loadStatus = async () => {
    try {
      setLoading(true)
      const data = await subscriptionApi.getStatus()
      setStatus(data)
    } catch (error) {
      console.error('Error loading subscription status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentCreated = (confirmationUrl: string) => {
    // Сохраняем метку, что платеж инициирован (localStorage для сохранения между сессиями)
    localStorage.setItem('payment_initiated', Date.now().toString())
    
    // Открываем страницу оплаты
    console.log('💳 Opening payment page...')
    
    if (window.Telegram?.WebApp) {
      // В Telegram Mini App используем openLink (откроет во внешнем браузере)
      window.Telegram.WebApp.openLink(confirmationUrl)
    } else {
      // Fallback для веб-версии
      window.location.href = confirmationUrl
    }
  }

  const togglePlans = () => {
    const newState = !showPlans
    setShowPlans(newState)
    
    // Скроллим к тарифам при открытии, чтобы вся вью помещалась
    if (newState) {
      setTimeout(() => {
        const plansElement = document.querySelector('.subscription-plans-container')
        if (plansElement) {
          plansElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }

  const isActive = status?.subscriptionStatus === 'active' && (status?.daysRemaining || 0) > 0
  const isLifetime = isActive && (status?.daysRemaining || 0) > 365 // lifetime plan = 36525 days
  const subscriptionLevel = isActive ? 'Premium' : 'Free'

  // Автоматически закрываем панель тарифов, если подписка активировалась
  useEffect(() => {
    if (isActive && showPlans) {
      console.log('Subscription activated, hiding plans panel')
      setShowPlans(false)
    }
  }, [isActive])

  // Скелетон загрузки
  if (loading || externalLoading) {
    return (
      <div className="mb-4">
        <div className="p-4 rounded-[24px] shadow-lg mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-300/50 dark:bg-gray-600/50 animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-4 w-20 bg-gray-300/50 dark:bg-gray-600/50 rounded animate-pulse"></div>
                <div className="h-3 w-32 bg-gray-300/50 dark:bg-gray-600/50 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="h-9 w-24 bg-gray-300/50 dark:bg-gray-600/50 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      {/* Карточка статуса подписки: Free — бейдж + «Получить PRO»; Pro — цветная карточка + остаток дней + «Продлить» */}
      <div className={`p-4 sm:p-5 rounded-[24px] shadow-lg mb-4 transition-all border ${
        isActive 
          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/30 dark:border-indigo-500/30' 
          : 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${
              isActive 
                ? 'bg-white/20 backdrop-blur-sm' 
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <span className="text-2xl" aria-hidden>{isActive ? '💎' : '🔒'}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`font-semibold text-base ${
                  isActive ? 'text-white' : 'text-gray-800 dark:text-gray-200'
                }`}>
                  {subscriptionLevel}
                </p>
                {!isActive && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                    Free
                  </span>
                )}
              </div>
              {isActive && status?.daysRemaining != null ? (
                <p className="text-sm text-white/85 mt-0.5">
                  {isLifetime ? 'Навсегда' : `Осталось ${status.daysRemaining} ${status.daysRemaining === 1 ? 'день' : status.daysRemaining < 5 ? 'дня' : 'дней'}`}
                </p>
              ) : !isActive && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  До 3 привычек
                </p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            {isActive && !isLifetime ? (
              <button
                data-update-subscription-button
                onClick={togglePlans}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all bg-white/95 text-indigo-600 hover:bg-white active:scale-95 shadow-sm flex items-center gap-2"
              >
                <span>Продлить</span>
                <svg
                  className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${showPlans ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : !isActive ? (
              <button
                data-update-subscription-button
                onClick={togglePlans}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 active:scale-95 shadow-md flex items-center gap-2"
              >
                <span>Получить PRO</span>
                <svg 
                  className={`w-4 h-4 transition-transform duration-300 ${showPlans ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Анимированный блок с тарифами — всегда показывается целиком */}
      <div className={`subscription-plans-container overflow-hidden transition-all duration-300 ease-in-out ${
        showPlans 
          ? 'max-h-none opacity-100 mb-4' 
          : 'max-h-0 opacity-0 mb-0'
      }`}>
        <div className={`transition-transform duration-300 ${
          showPlans ? 'translate-y-0' : '-translate-y-4'
        }`}>
          <SubscriptionPlans 
            onPaymentCreated={handlePaymentCreated}
            onStatusUpdate={loadStatus}
          />
        </div>
      </div>
    </div>
  )
}
