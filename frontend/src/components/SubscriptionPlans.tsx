import { useState, useEffect } from 'react'
import { track } from '@vercel/analytics'
import { subscriptionApi } from '../services/api'
import type { SubscriptionPlan } from '../types'

interface SubscriptionPlansProps {
  onPaymentCreated?: (confirmationUrl: string) => void
  onClose?: () => void
  onStatusUpdate?: () => void
}

type PlanTab = 'month' | 'year' | 'lifetime'

const PRO_BENEFITS = [
  { icon: '🚀', title: 'Без ограничений', description: 'Сколько угодно привычек' },
  { icon: '🔔', title: 'Умные напоминания', description: 'По времени и интервалам' },
  { icon: '📊', title: 'Аналитика прогресса', description: 'Следи за результатом' },
  { icon: '🎯', title: 'Цели и челленджи', description: '21 / 30 / 90 дней' },
  { icon: '🎨', title: 'Персонализация', description: 'Темы и иконки' },
  { icon: '🤖', title: 'Умный помощник', description: 'Советы и подсказки' }
]

export default function SubscriptionPlans({ onPaymentCreated }: SubscriptionPlansProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [processingPlan, setProcessingPlan] = useState<PlanTab | null>(null)
  const [activeTab, setActiveTab] = useState<PlanTab>('year')

  useEffect(() => {
    loadPlans()
  }, [])

  useEffect(() => {
    if (plans.length > 0) {
      track('pricing_viewed', { planType: activeTab })
    }
  }, [activeTab, plans.length])

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

  const handleSubscribe = async (planId: PlanTab) => {
    try {
      setProcessing(true)
      setProcessingPlan(planId)
      setError('')
      sessionStorage.setItem('pending_payment_plan', planId)
      const response = await subscriptionApi.createPayment({ planId })
      track('payment_initiated', { planType: planId })
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
      setProcessingPlan(null)
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
  const lifetimePlan = plans.find(p => p.id === 'lifetime')
  const monthlyPrice = monthPlan?.price ?? 79
  const yearlyPrice = yearPlan?.price ?? 699
  const yearlyMonthlyEquivalent = yearlyPrice / 12
  const savings = (monthlyPrice * 12) - yearlyPrice
  const savingsPercent = Math.round((savings / (monthlyPrice * 12)) * 100)
  const fullYearPrice = monthlyPrice * 12

  // Дата «доступно до» для lifetime — ограниченное предложение (например +30 дней)
  const lifetimeOfferEndDate = new Date()
  lifetimeOfferEndDate.setDate(lifetimeOfferEndDate.getDate() + 30)
  const lifetimeOfferEndStr = lifetimeOfferEndDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const currentPlan = activeTab === 'month' ? monthPlan : activeTab === 'year' ? yearPlan : lifetimePlan

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[24px] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-300 text-sm font-medium text-center">{error}</p>
        </div>
      )}

      {/* Табы Месяц | Год (по умолчанию, Лучший выбор) */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/50 overflow-hidden rounded-t-[24px]">
        <button
          onClick={() => setActiveTab('month')}
          className={`flex-1 px-3 py-4 text-sm font-semibold transition-all relative ${
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
          className={`flex-1 px-3 py-4 text-sm font-semibold transition-all relative ${
            activeTab === 'year'
              ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 shadow-md'
              : 'text-gray-500 dark:text-gray-500 opacity-60 hover:opacity-80'
          }`}
        >
          <span className="flex items-center justify-center gap-2 flex-wrap">
            Год
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-medium rounded-full">
              Лучший выбор
            </span>
            {savings > 0 && (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                −{savingsPercent}%
              </span>
            )}
          </span>
          {activeTab === 'year' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
          )}
        </button>
      </div>

      {/* Контент тарифа Месяц/Год */}
      <div className="p-6 rounded-b-[24px]">
        {(activeTab === 'month' && monthPlan) || (activeTab === 'year' && yearPlan) ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-2 mb-2">
                {activeTab === 'year' ? (
                  <>
                    <span className="text-2xl font-normal text-gray-400 dark:text-gray-500 line-through">
                      {fullYearPrice} ₽
                    </span>
                    <span className="text-5xl font-bold text-gray-900 dark:text-gray-100">
                      {currentPlan!.price}
                    </span>
                    <span className="text-xl text-gray-600 dark:text-gray-400">₽</span>
                  </>
                ) : (
                  <>
                    <span className="text-5xl font-bold text-gray-900 dark:text-gray-100">
                      {currentPlan!.price}
                    </span>
                    <span className="text-xl text-gray-600 dark:text-gray-400">₽</span>
                  </>
                )}
              </div>
              {activeTab === 'year' && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {yearlyMonthlyEquivalent.toFixed(0)} ₽/мес
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
                  за {currentPlan!.durationDays} дней
                </p>
              )}
            </div>

            {/* Преимущества PRO — двухстрочный премиальный формат */}
            <div className="space-y-3">
              {PRO_BENEFITS.map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 p-4 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-[16px] border border-blue-100/50 dark:border-blue-800/30"
                >
                  <span className="text-2xl flex-shrink-0 leading-none" aria-hidden>{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSubscribe(activeTab)}
              disabled={processing}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-[16px] font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {processing && processingPlan === activeTab ? 'Обработка...' : 'Оформить подписку'}
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Тариф не найден</p>
          </div>
        )}

        {/* Блок «Навсегда» — отдельно */}
        {lifetimePlan && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="p-4 rounded-[20px] bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-700/50">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                Доступно до {lifetimeOfferEndStr}
              </p>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Навсегда — {lifetimePlan.price} ₽
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Один платёж, доступ навсегда
                  </p>
                </div>
                <button
                  onClick={() => handleSubscribe('lifetime')}
                  disabled={processing}
                  className="flex-shrink-0 px-5 py-2.5 rounded-xl font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing && processingPlan === 'lifetime' ? 'Обработка...' : 'Купить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
