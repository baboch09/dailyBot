import React, { useEffect, useRef } from 'react'

export type ReminderMode = 'daily' | 'interval' | 'weekdays' | 'custom'

interface ReminderBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  /** Режим по умолчанию (для Free только 'daily') */
  mode: ReminderMode
  onModeChange?: (mode: ReminderMode) => void
  /** Время в формате HH:MM (режим День) */
  time: string
  onTimeChange: (time: string) => void
  reminderEnabled: boolean
  onReminderEnabledChange: (enabled: boolean) => void
  onSave: () => void
  isSaving?: boolean
  isPremium: boolean
  /** При клике на режим, доступный только в PRO */
  onRequestPro?: () => void
}

const MODES: { id: ReminderMode; label: string; proOnly?: boolean }[] = [
  { id: 'daily', label: 'День' },
  { id: 'interval', label: 'Интервал', proOnly: true },
  { id: 'weekdays', label: 'Неделя', proOnly: true },
  { id: 'custom', label: 'Кастом', proOnly: true }
]

export default function ReminderBottomSheet({
  isOpen,
  onClose,
  mode,
  onModeChange,
  time,
  onTimeChange,
  reminderEnabled,
  onReminderEnabledChange,
  onSave,
  isSaving = false,
  isPremium,
  onRequestPro
}: ReminderBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const effectiveMode = !isPremium && mode !== 'daily' ? 'daily' : mode
  const previewText = reminderEnabled
    ? effectiveMode === 'daily'
      ? `Напоминание: каждый день в ${time}`
      : effectiveMode === 'interval'
        ? 'Напоминание: по интервалу (PRO)'
        : effectiveMode === 'weekdays'
          ? 'Напоминание: по дням недели (PRO)'
          : 'Напоминание: кастом (PRO)'
    : 'Напоминание отключено'

  const handleModeClick = (m: ReminderMode) => {
    if (MODES.find(x => x.id === m)?.proOnly && !isPremium) {
      onRequestPro?.()
      return
    }
    onModeChange?.(m)
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-sheet-title"
        className="fixed left-0 right-0 bottom-0 z-50 bg-white dark:bg-gray-800 rounded-t-[28px] shadow-2xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
      >
        {/* Ручка */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        <div className="px-4 pb-6 overflow-y-auto flex-1 min-h-0">
          <h2 id="reminder-sheet-title" className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Напоминание
          </h2>

          {/* Сегментированный контрол: День | Интервал | Неделя | Кастом */}
          <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-700/50 mb-4">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeClick(m.id)}
                className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                  effectiveMode === m.id
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-600/50'
                } ${m.proOnly && !isPremium ? 'opacity-75' : ''}`}
              >
                <span className="flex items-center justify-center gap-1">
                  {m.label}
                  {m.proOnly && !isPremium && <span className="text-xs">🔒</span>}
                </span>
              </button>
            ))}
          </div>

          {/* Включить напоминание */}
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Включить напоминание
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => onReminderEnabledChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5 after:border after:border-gray-300 dark:after:border-gray-600" />
            </label>
          </div>

          {/* Режим День: выбор времени */}
          {effectiveMode === 'daily' && reminderEnabled && (
            <div className="mb-4">
              <label htmlFor="reminder-sheet-time" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Время
              </label>
              <input
                id="reminder-sheet-time"
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
          )}

          {/* Плейсхолдеры для PRO-режимов (без сохранения в БД пока) */}
          {effectiveMode === 'interval' && reminderEnabled && (
            <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Режим «Интервал» скоро будет доступен. Пока используйте «День».
              </p>
            </div>
          )}
          {effectiveMode === 'weekdays' && reminderEnabled && (
            <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Режим «Неделя» скоро будет доступен. Пока используйте «День».
              </p>
            </div>
          )}
          {effectiveMode === 'custom' && reminderEnabled && (
            <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Режим «Кастом» скоро будет доступен. Пока используйте «День».
              </p>
            </div>
          )}

          {/* Превью */}
          <div className="mb-6 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {previewText}
            </p>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
