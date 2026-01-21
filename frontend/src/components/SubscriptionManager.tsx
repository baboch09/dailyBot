import { useState } from 'react'
import SubscriptionStatus from './SubscriptionStatus'
import SubscriptionPlans from './SubscriptionPlans'

type View = 'status' | 'plans'

export default function SubscriptionManager() {
  const [view, setView] = useState<View | null>(null)

  const handlePaymentCreated = (confirmationUrl: string) => {
    // Открываем страницу оплаты
    window.location.href = confirmationUrl
  }

  if (view === null) {
    return (
      <div className="flex gap-3 justify-center mb-6">
        <button
          onClick={() => setView('status')}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg"
        >
          💎 Моя подписка
        </button>
        <button
          onClick={() => setView('plans')}
          className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
        >
          ⬆️ Обновить тариф
        </button>
      </div>
    )
  }

  return (
    <div className="mb-6">
      {view === 'status' && (
        <SubscriptionStatus onClose={() => setView(null)} />
      )}
      {view === 'plans' && (
        <SubscriptionPlans 
          onPaymentCreated={handlePaymentCreated}
          onClose={() => setView(null)} 
        />
      )}
    </div>
  )
}