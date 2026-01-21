import { useState, useEffect } from 'react'
import SubscriptionStatus from './SubscriptionStatus'
import SubscriptionPlans from './SubscriptionPlans'
import { subscriptionApi } from '../services/api'
import type { SubscriptionStatus as SubscriptionStatusType } from '../types'

export default function SubscriptionManager() {
  const [activeTab, setActiveTab] = useState<'status' | 'plans'>('status')
  const [status, setStatus] = useState<SubscriptionStatusType | null>(null)

  useEffect(() => {
    loadStatus()
    
    // Проверяем статус платежей в pending при загрузке
    if (status?.recentPayments) {
      const pendingPayments = status.recentPayments.filter(p => p.status === 'pending')
      if (pendingPayments.length > 0) {
        // Обновляем статус через 5 секунд после загрузки
        setTimeout(() => {
          loadStatus()
        }, 5000)
      }
    }
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
            onClick={() => setActiveTab(activeTab === 'status' ? 'plans' : 'status')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              isActive
                ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                : 'bg-white/90 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700'
            }`}
          >
            {activeTab === 'status' ? 'Обновить' : 'Статус'}
          </button>
        </div>
      </div>

      {/* Табы */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-[24px] shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === 'status'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Моя подписка
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === 'plans'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Тарифы
          </button>
        </div>
        <div className="p-4">
          {activeTab === 'status' && (
            <SubscriptionStatus onStatusUpdate={loadStatus} />
          )}
          {activeTab === 'plans' && (
            <SubscriptionPlans 
              onPaymentCreated={handlePaymentCreated}
              onStatusUpdate={loadStatus}
            />
          )}
        </div>
      </div>
    </div>
  )
}