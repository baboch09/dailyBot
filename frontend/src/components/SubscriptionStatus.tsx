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
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-[20px] shadow-sm p-4 border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
          История платежей
        </h3>
        <div className="space-y-2">
          {status.recentPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-[16px]"
            >
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                  {payment.amount} ₽
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
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
    </div>
  )
}
