import { useState, useEffect } from 'react'
import SubscriptionStatus from './SubscriptionStatus'
import SubscriptionPlans from './SubscriptionPlans'
import { subscriptionApi } from '../services/api'
import type { SubscriptionStatus as SubscriptionStatusType } from '../types'

export default function SubscriptionManager() {
  const [showPlans, setShowPlans] = useState(false)
  const [status, setStatus] = useState<SubscriptionStatusType | null>(null)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const data = await subscriptionApi.getStatus()
      setStatus(data)
    } catch (error) {
      console.error('Error loading subscription status:', error)
    }
  }

  const handlePaymentCreated = (confirmationUrl: string) => {
    window.location.href = confirmationUrl
  }

  const togglePlans = () => {
    setShowPlans(!showPlans)
  }

  const isActive = status?.subscriptionStatus === 'active' && (status?.daysRemaining || 0) > 0
  const subscriptionLevel = isActive ? 'Premium' : 'Free'

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
          <button
            onClick={togglePlans}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all transform ${
              isActive
                ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 active:scale-95'
                : 'bg-white/90 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 active:scale-95'
            } ${showPlans ? 'rotate-180' : ''}`}
          >
            ⬆️ Обновить
          </button>
        </div>
      </div>

      {/* Статус подписки - всегда показываем компактно */}
      <SubscriptionStatus onStatusUpdate={loadStatus} />

      {/* Анимированный блок с тарифами */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
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
    </div>
  )
}
