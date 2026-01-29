import { useState, useEffect } from 'react'
import SubscriptionStatus from './SubscriptionStatus'
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
    
    // Проверяем, вернулся ли пользователь после оплаты
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
    
    // Открываем страницу оплаты в текущем окне Telegram WebView
    // После оплаты пользователь вернется в бот через deep link
    console.log('💳 Opening payment page...')
    window.location.href = confirmationUrl
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
      {/* Красивая карточка статуса подписки */}
      <div className={`p-4 rounded-[24px] shadow-lg mb-4 transition-all ${
        isActive 
          ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
          : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isActive 
                ? 'bg-white/20 backdrop-blur-sm' 
                : 'bg-gray-300/50 dark:bg-gray-600/50'
            }`}>
              <span className="text-2xl">{isActive ? '💎' : '🔒'}</span>
            </div>
            <div>
              <p className={`font-semibold text-sm ${
                isActive ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'
              }`}>
                {subscriptionLevel}
              </p>
              {isActive && status?.daysRemaining ? (
                <p className={`text-xs ${
                  isActive ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {status.daysRemaining} дней осталось
                </p>
              ) : (
                <p className={`text-xs ${
                  isActive ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  Максимум 3 привычки
                </p>
              )}
            </div>
          </div>
          {/* Кнопка "Обновить" показываем только если нет активной подписки */}
          {!isActive && (
            <button
              data-update-subscription-button
              onClick={togglePlans}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all bg-white/90 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 active:scale-95 flex items-center gap-2"
            >
              <span>Обновить</span>
              <svg 
                className={`w-4 h-4 transition-transform duration-300 ${showPlans ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Анимированный блок с тарифами */}
      <div className={`subscription-plans-container overflow-hidden transition-all duration-300 ease-in-out ${
        showPlans 
          ? 'max-h-[800px] opacity-100 mb-4' 
          : 'max-h-0 opacity-0 mb-0'
      }`}>
        <div className={`transform transition-transform duration-300 ${
          showPlans ? 'translate-y-0' : '-translate-y-4'
        }`}>
          <SubscriptionPlans 
            onPaymentCreated={handlePaymentCreated}
            onStatusUpdate={loadStatus}
          />
        </div>
      </div>

      {/* История платежей - показываем внизу */}
      <SubscriptionStatus onStatusUpdate={loadStatus} />
    </div>
  )
}
