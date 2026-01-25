import { useState, useEffect } from 'react'
import { subscriptionApi } from '../services/api'
import type { SubscriptionStatus as SubscriptionStatusType } from '../types'

interface SubscriptionStatusProps {
  onClose?: () => void
  onStatusUpdate?: () => void
}

export default function SubscriptionStatus({}: SubscriptionStatusProps) {
  const [status, setStatus] = useState<SubscriptionStatusType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPayments, setShowPayments] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await subscriptionApi.getStatus()
      setStatus(data)
    } catch (err: any) {
      console.error('Error loading subscription status:', err)
      setError(err.response?.data?.error || 'Ошибка при загрузке статуса подписки')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null // Не показываем загрузку, статус уже в карточке
  }

  if (error) {
    return null // Не показываем ошибку отдельно
  }

  if (!status) return null

  // Показываем только историю платежей, если есть
  if (status.recentPayments.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* История платежей */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-[20px] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowPayments(!showPayments)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            История платежей
          </h3>
          <svg 
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${showPayments ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Выпадающий список платежей */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
          showPayments ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="px-4 pb-4 space-y-2">
            {status.recentPayments.map((payment) => (
              <div
                key={payment.id}
                className={`flex items-center justify-between p-3 rounded-[16px] transition-all ${
                  payment.isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {payment.isActive && (
                    <span className="text-blue-600 dark:text-blue-400 text-sm">●</span>
                  )}
                  <div>
                    <p className={`font-medium text-sm ${
                      payment.isActive
                        ? 'text-blue-800 dark:text-blue-200'
                        : 'text-gray-800 dark:text-gray-200'
                    }`}>
                      {payment.amount} ₽
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(payment.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    payment.isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : payment.status === 'succeeded'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : payment.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {payment.isActive 
                    ? 'Активна' 
                    : payment.status === 'succeeded' 
                    ? 'Оплачено' 
                    : payment.status === 'pending' 
                    ? 'Ожидание' 
                    : 'Ошибка'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
