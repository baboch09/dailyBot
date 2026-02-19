import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export type ReminderMode = 'daily' | 'weekdays'

// ISO weekday: 1 = Пн, 7 = Вс
const WEEKDAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' }
]

function parseReminderDays(s: string | null | undefined): number[] {
  if (!s || !s.trim()) return []
  return s
    .split(',')
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => n >= 1 && n <= 7)
}

function formatReminderDays(days: number[]): string | null {
  if (days.length === 0) return null
  return [...new Set(days)].sort((a, b) => a - b).join(',')
}

interface ReminderBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  mode: ReminderMode
  onModeChange?: (mode: ReminderMode) => void
  time: string
  onTimeChange: (time: string) => void
  reminderEnabled: boolean
  onReminderEnabledChange: (enabled: boolean) => void
  /** Режим Неделя: "1,2,3,4,5" (ISO 1=Пн, 7=Вс). null = каждый день */
  reminderDays: string | null
  onReminderDaysChange: (days: string | null) => void
  onSave: () => void
  isSaving?: boolean
  isPremium: boolean
  onRequestPro?: () => void
}

const MODES: { id: ReminderMode; label: string }[] = [
  { id: 'daily', label: 'День' },
  { id: 'weekdays', label: 'Неделя' }
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
  reminderDays,
  onReminderDaysChange,
  onSave,
  isSaving = false,
  isPremium,
  onRequestPro
}: ReminderBottomSheetProps) {
  const selectedDays = parseReminderDays(reminderDays)

  const toggleDay = (day: number) => {
    const next = selectedDays.includes(day) ? selectedDays.filter((d) => d !== day) : [...selectedDays, day].sort((a, b) => a - b)
    onReminderDaysChange(formatReminderDays(next))
  }

  const setPreset = (preset: 'weekdays' | 'weekend' | 'all') => {
    if (preset === 'weekdays') onReminderDaysChange('1,2,3,4,5')
    else if (preset === 'weekend') onReminderDaysChange('6,7')
    else onReminderDaysChange('1,2,3,4,5,6,7')
  }
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

  const weekdaysPreview =
    selectedDays.length === 0
      ? 'нет дней'
      : selectedDays.length === 7
        ? 'каждый день'
        : WEEKDAY_LABELS.filter((d) => selectedDays.includes(d.value))
            .map((d) => d.label)
            .join(', ')
  const previewText = reminderEnabled
    ? mode === 'daily'
      ? `Напоминание: каждый день в ${time}`
      : `Напоминание: ${weekdaysPreview} в ${time}`
    : 'Напоминание отключено'

  const handleModeClick = (m: ReminderMode) => {
    onModeChange?.(m)
  }

  const modalContent = !isOpen ? null : (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[10000] transition-opacity"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none"
        aria-hidden
      >
        <div
          ref={sheetRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reminder-sheet-title"
          className="pointer-events-auto w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-[24px] shadow-2xl border border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="px-5 pt-5 pb-6">
          <h2 id="reminder-sheet-title" className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Напоминание
          </h2>

          {/* Режим: День | Неделя */}
          <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-700/50 mb-4">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeClick(m.id)}
                className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m.id
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-600/50'
                }`}
              >
                {m.label}
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

          {/* Выбор времени (общий для День и Неделя) */}
          {reminderEnabled && (
            <div className="mb-4">
              <label htmlFor="reminder-sheet-time" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Время
              </label>
              <input
                id="reminder-sheet-time"
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                className="w-[7rem] max-w-full px-3 py-2 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 [&::-webkit-datetime-edit]:text-center"
              />
              {mode === 'weekdays' && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Дни недели</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['weekdays', 'weekend', 'all'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPreset(preset as 'weekdays' | 'weekend' | 'all')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {preset === 'weekdays' ? 'Будни' : preset === 'weekend' ? 'Выходные' : 'Все'}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {WEEKDAY_LABELS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleDay(value)}
                        className={`w-9 h-9 rounded-lg text-xs font-semibold transition-colors ${
                          selectedDays.includes(value)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
      </div>
    </>
  )

  return createPortal(modalContent, document.body)
}
