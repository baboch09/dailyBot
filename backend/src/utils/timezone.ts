/**
 * Парсит часовой пояс в формате "UTC+3", "UTC-5" и возвращает смещение в часах
 */
export function parseTimezoneOffset(timezone: string): number {
  const match = timezone.match(/UTC([+-])(\d+)/)
  if (!match) {
    return 3 // MSK по умолчанию
  }
  const sign = match[1] === '+' ? 1 : -1
  return parseInt(match[2], 10) * sign
}

/**
 * Возвращает начало "сегодня" в часовом поясе пользователя как Date в UTC.
 * Для Москвы (UTC+3): 00:00 МСК = 21:00 UTC предыдущего дня.
 * Это обеспечивает корректное обновление дня в полночь по местному времени.
 */
export function getStartOfTodayUTC(timezone: string): Date {
  const offsetHours = parseTimezoneOffset(timezone)
  const now = new Date()
  // Локальное время пользователя = UTC + offset
  const localMs = now.getTime() + offsetHours * 60 * 60 * 1000
  const localDate = new Date(localMs)
  const y = localDate.getUTCFullYear()
  const m = localDate.getUTCMonth()
  const d = localDate.getUTCDate()
  // Полночь в часовом поясе пользователя в UTC
  const midnightLocal = Date.UTC(y, m, d) - offsetHours * 60 * 60 * 1000
  return new Date(midnightLocal)
}

/**
 * Начало следующего дня (в часовом поясе пользователя)
 */
export function getStartOfTomorrowUTC(timezone: string): Date {
  const today = getStartOfTodayUTC(timezone)
  return new Date(today.getTime() + 24 * 60 * 60 * 1000)
}

/**
 * Начало предыдущего дня (в часовом поясе пользователя)
 */
export function getStartOfPreviousDayUTC(date: Date, timezone: string): Date {
  const offsetHours = parseTimezoneOffset(timezone)
  const dateMs = date.getTime()
  const localMs = dateMs + offsetHours * 60 * 60 * 1000
  const localDate = new Date(localMs)
  const y = localDate.getUTCFullYear()
  const m = localDate.getUTCMonth()
  const d = localDate.getUTCDate()
  const midnightLocal = Date.UTC(y, m, d) - offsetHours * 60 * 60 * 1000
  const prevDayMidnight = midnightLocal - 24 * 60 * 60 * 1000
  return new Date(prevDayMidnight)
}

/**
 * Нормализует дату лога к началу дня в часовом поясе пользователя для сравнения.
 * Логи хранятся как UTC midnight календарного дня пользователя.
 */
export function normalizeLogDateToDay(date: Date, timezone: string): Date {
  const offsetHours = parseTimezoneOffset(timezone)
  const dateMs = date.getTime()
  const localMs = dateMs + offsetHours * 60 * 60 * 1000
  const localDate = new Date(localMs)
  const y = localDate.getUTCFullYear()
  const m = localDate.getUTCMonth()
  const d = localDate.getUTCDate()
  const midnightLocal = Date.UTC(y, m, d) - offsetHours * 60 * 60 * 1000
  return new Date(midnightLocal)
}

/**
 * Форматирует дату (начало дня в UTC) в YYYY-MM-DD по часовому поясу пользователя
 */
export function formatDateInTimezone(date: Date, timezone: string): string {
  const offsetHours = parseTimezoneOffset(timezone)
  const localMs = date.getTime() + offsetHours * 60 * 60 * 1000
  const localDate = new Date(localMs)
  const y = localDate.getUTCFullYear()
  const m = String(localDate.getUTCMonth() + 1).padStart(2, '0')
  const d = String(localDate.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
