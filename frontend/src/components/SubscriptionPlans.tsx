import { useState, useEffect } from 'react'
import { subscriptionApi } from '../services/api'
import type { SubscriptionPlan } from '../types'

interface SubscriptionPlansProps {
  onPaymentCreated?: (confirmationUrl: string) => void
  onClose?: () => void
  onStatusUpdate?: () => void
}

export default function SubscriptionPlans({ onPaymentCreated }: SubscriptionPlansProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'month' | 'year'>('month')

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

  const handleSubscribe = async () => {
    try {
      setProcessing(true)
      setError('')
      const response = await subscriptionApi.createPayment({ planId: activeTab })
      
      if (response.confirmationUrl) {
        if (onPaymentCreated) {
          onPaymentCreated(response.confirmationUrl)
        } else {
          window.location.href = response.confirmationUrl
        }
      }
    } catch (err: any) {
      console.error('Error creating payment:', err)
      setError(err.response?.data?.error || err.response?.data?.message || 'Ошибка при создании платежа')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-[24px] shadow-xl p-6 border border-gray-100 dark:border-gray-700">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Загрузка тарифов...</p>
        </div>
      </div>
    )
  }

  const monthPlan = plans.find(p => p.id === 'month')
  const yearPlan = plans.find(p => p.id === 'year')
  const currentPlan = activeTab === 'month' ? monthPlan : yearPlan

  // Вычисляем выгоду от годовой подписки
  const monthlyPrice = monthPlan?.price || 79
  const yearlyPrice = yearPlan?.price || 799
  const yearlyMonthlyEquivalent = yearlyPrice / 12
  const savings = (monthlyPrice * 12) - yearlyPrice
  const savingsPercent = Math.round((savings / (monthlyPrice * 12)) * 100)
  const fullYearPrice = monthlyPrice * 12 // Полная стоимость без выгоды

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[24px] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-300 text-sm font-medium text-center">{error}</p>
        </div>
      )}

      {/* Табы Месяц/Год */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/50 overflow-hidden rounded-t-[24px]">
        <button
          onClick={() => setActiveTab('month')}
          className={`flex-1 px-4 py-4 text-sm font-semibold transition-all relative ${
            activeTab === 'month'
              ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 shadow-md'
              : 'text-gray-500 dark:text-gray-500 opacity-60 hover:opacity-80'
          }`}
        >
          Месяц
          {activeTab === 'month' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('year')}
          className={`flex-1 px-4 py-4 text-sm font-semibold transition-all relative ${
            activeTab === 'year'
              ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 shadow-md'
              : 'text-gray-500 dark:text-gray-500 opacity-60 hover:opacity-80'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            Год
            {savings > 0 && (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                Экономия {savingsPercent}%
              </span>
            )}
          </span>
          {activeTab === 'year' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
          )}
        </button>
      </div>

      {/* Контент тарифа */}
      <div className="p-6 rounded-b-[24px]">
        {currentPlan ? (
          <div className="space-y-6">
            {/* Цена */}
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-2 mb-2">
                {activeTab === 'year' ? (
                  <>
                    <span className="text-2xl font-normal text-gray-400 dark:text-gray-500 line-through">
                      {fullYearPrice} ₽
                    </span>
                    <span className="text-5xl font-bold text-gray-900 dark:text-gray-100">
                      {currentPlan.price}
                    </span>
                    <span className="text-xl text-gray-600 dark:text-gray-400">₽</span>
                  </>
                ) : (
                  <>
                    <span className="text-5xl font-bold text-gray-900 dark:text-gray-100">
                      {currentPlan.price}
                    </span>
                    <span className="text-xl text-gray-600 dark:text-gray-400">₽</span>
                  </>
                )}
              </div>
              
              {activeTab === 'year' && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {yearlyMonthlyEquivalent.toFixed(0)} ₽/месяц
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <span className="text-green-700 dark:text-green-400 text-sm font-semibold">
                      💰 Экономия {savings} ₽
                    </span>
                  </div>
                </div>
              )}
              
              {activeTab === 'month' && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  за {currentPlan.durationDays} дней
                </p>
              )}
            </div>

            {/* Преимущества */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-[16px]">
                <span className="text-xl">✓</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Безлимит привычек
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-[16px]">
                <span className="text-xl">✓</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Все функции доступны
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-[16px]">
                <span className="text-xl">✓</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Напоминания в Telegram
                </span>
              </div>
            </div>

            {/* Кнопка подписки */}
            <button
              onClick={handleSubscribe}
              disabled={processing}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-[16px] font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {processing ? 'Обработка...' : `Оформить подписку`}
            </button>

          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Тариф не найден</p>
          </div>
        )}
      </div>
    </div>
  )
}
