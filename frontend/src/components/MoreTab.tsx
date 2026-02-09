import SubscriptionStatus from './SubscriptionStatus'

interface MoreTabProps {
  isPremium: boolean
}

const PRO_FEATURES = [
  {
    id: 'analytics',
    icon: '📊',
    title: 'Аналитика прогресса',
    description: 'Графики, стрики и отчёты по привычкам',
    soon: true
  },
  {
    id: 'assistant',
    icon: '🤖',
    title: 'Умный помощник',
    description: 'Советы, подсказки и мотивация',
    soon: true
  },
  {
    id: 'personalization',
    icon: '🎨',
    title: 'Персонализация',
    description: 'Темы, иконки и оформление',
    soon: true
  }
]

export default function MoreTab({ isPremium }: MoreTabProps) {
  return (
    <div className="space-y-6">
      <header className="text-center pt-2 pb-2">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
          Ещё
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          PRO-возможности и настройки
        </p>
      </header>

      {/* Карточки PRO-фич */}
      <div className="space-y-3">
        {PRO_FEATURES.map((feature) => (
          <button
            key={feature.id}
            type="button"
            className="w-full flex items-center gap-4 p-4 rounded-[20px] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all text-left disabled:opacity-70"
          >
            <span className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center text-2xl">
              {feature.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {feature.title}
                {!isPremium && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    PRO
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {feature.description}
              </p>
            </div>
            {feature.soon ? (
              <span className="flex-shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">
                Скоро
              </span>
            ) : (
              <span className="flex-shrink-0 text-gray-400 dark:text-gray-500" aria-hidden>›</span>
            )}
          </button>
        ))}
      </div>

      {/* История платежей */}
      <SubscriptionStatus />
    </div>
  )
}
