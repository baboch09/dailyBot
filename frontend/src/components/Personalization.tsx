import { useState, useEffect } from 'react'
import { getStoredTheme, setTheme, type ThemeValue } from '../utils/theme'

interface PersonalizationProps {
  onBack: () => void
  isPremium: boolean
  onUpgradeClick?: () => void
}

const THEME_OPTIONS: { value: ThemeValue; label: string; icon: string }[] = [
  { value: 'light', label: 'Светлая', icon: '☀️' },
  { value: 'dark', label: 'Тёмная', icon: '🌙' },
  { value: 'system', label: 'Как в системе', icon: '📱' }
]

export default function Personalization({ onBack, isPremium, onUpgradeClick }: PersonalizationProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeValue>(getStoredTheme())

  useEffect(() => {
    setCurrentTheme(getStoredTheme())
  }, [])

  const handleThemeChange = (value: ThemeValue) => {
    if (!isPremium) return
    setTheme(value)
    setCurrentTheme(value)
  }

  if (!isPremium) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            aria-label="Назад"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
              Персонализация
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Темы и оформление
            </p>
          </div>
        </div>

        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-[24px] border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-4xl mx-auto mb-4">
            🔒
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Только для PRO
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
            Выбор темы и персонализация доступны по подписке PRO или «Навсегда». Оформите подписку, чтобы настроить оформление приложения.
          </p>
          {onUpgradeClick && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="w-full py-3.5 px-5 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:from-blue-600 hover:to-indigo-700 transition-all"
            >
              Получить PRO
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          aria-label="Назад"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            Персонализация
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Темы и оформление
          </p>
        </div>
      </div>

      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-[24px] border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">
            Тема
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Выберите светлый или тёмный режим
          </p>
        </div>
        <div className="p-2">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleThemeChange(option.value)}
              className={`w-full flex items-center gap-4 p-4 rounded-[16px] transition-colors text-left ${
                currentTheme === option.value
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-transparent'
              }`}
            >
              <span className="text-2xl" aria-hidden>{option.icon}</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 flex-1">
                {option.label}
              </span>
              {currentTheme === option.value && (
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
