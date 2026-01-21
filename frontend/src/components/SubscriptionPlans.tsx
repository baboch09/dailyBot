import { useState, useEffect } from 'react'
import { subscriptionApi } from '../services/api'
import type { SubscriptionPlan } from '../types'

interface SubscriptionPlansProps {
  onPaymentCreated?: (confirmationUrl: string) => void
  onClose?: () => void
}

export default function SubscriptionPlans({ onPaymentCreated, onClose }: SubscriptionPlansProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await subscriptionApi.getPlans()
      setPlans(data.plans)
    } catch (err: any) {
      console.error('Error loading plans:', err)
      setError(err.response?.data?.error || 'Ошибка при загрузке тарифов')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    try {
      setProcessing(planId)
      setError('')
      const response = await subscriptionApi.createPayment({ planId: planId as 'month' | 'year' })
      
      if (response.confirmationUrl) {
        // Открываем страницу оплаты в новом окне или перенаправляем
        if (onPaymentCreated) {
          onPaymentCreated(response.confirmationUrl)
        } else {
          window.location.href = response.confirmationUrl
        }
      }
    } catch (err: any) {
      console.error('Error creating payment:', err)
      setError(err.response?.data?.error || err.response?.data?.message || 'Ошибка при создании платежа')
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-[32px] shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка тарифов...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-[32px] shadow-xl p-8 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Выберите тариф</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-[20px]">
          <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const isProcessing = processing === plan.id
          const isPopular = plan.id === 'month'

          return (
            <div
              key={plan.id}
              className={`relative p-6 rounded-[24px] border-2 transition-all ${
                isPopular
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Популярный
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                    {plan.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">₽</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {plan.durationDays} дней
                </p>
              </div>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-green-500">✓</span>
                  Безлимит привычек
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-green-500">✓</span>
                  Все функции доступны
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-green-500">✓</span>
                  Напоминания
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isProcessing || !!processing}
                className={`w-full py-3 px-4 rounded-[16px] font-semibold transition-all ${
                  isProcessing
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : isPopular
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                {isProcessing ? 'Обработка...' : `Оформить подписку`}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-[20px]">
        <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
          💳 Оплата проходит через ЮКассу. Используйте тестовую карту для проверки: 5555 5555 5555 4444
        </p>
      </div>
    </div>
  )
}