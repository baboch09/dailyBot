import { useState, useEffect } from 'react'
import { subscriptionApi } from '../services/api'
import type { SubscriptionStatus as SubscriptionStatusType } from '../types'

interface SubscriptionStatusProps {
  onClose?: () => void
}

export default function SubscriptionStatus({ onClose }: SubscriptionStatusProps) {
  const [status, setStatus] = useState<SubscriptionStatusType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-[32px] shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-[32px] shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <span className="text-4xl mb-4 block">⚠️</span>
          <p className="text-red-600 dark:text-red-400 font-medium mb-4">{error}</p>
          <button
            onClick={loadStatus}
            className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  if (!status) return null

  const isActive = status.subscriptionStatus === 'active' && status.daysRemaining > 0

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-[32px] shadow-xl p-8 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Подписка</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Статус подписки */}
        <div className={`p-6 rounded-[24px] ${isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gray-100 dark:bg-gray-700'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-semibold text-lg">
              {isActive ? 'Premium активна' : 'Free тариф'}
            </span>
            {isActive && (
              <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium">
                {status.daysRemaining} дн.
              </span>
            )}
          </div>
          {isActive && status.subscriptionExpiresAt && (
            <p className="text-white/80 text-sm">
              Действует до {new Date(status.subscriptionExpiresAt).toLocaleDateString('ru-RU')}
            </p>
          )}
          {!isActive && (
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Ограничение: максимум 3 привычки
            </p>
          )}
        </div>

        {/* История платежей */}
        {status.recentPayments.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              История платежей
            </h3>
            <div className="space-y-2">
              {status.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-[20px]"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {payment.amount} ₽
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(payment.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      payment.status === 'succeeded'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : payment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {payment.status === 'succeeded' ? 'Оплачено' : payment.status === 'pending' ? 'Ожидание' : 'Ошибка'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}