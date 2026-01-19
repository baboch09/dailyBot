// Утилиты для работы с Telegram WebApp API

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe?: {
          user?: {
            id: number
            first_name?: string
            last_name?: string
            username?: string
          }
        }
        ready: () => void
        expand: () => void
        close: () => void
        themeParams: {
          bg_color?: string
          text_color?: string
        }
      }
    }
  }
}

// Получить экземпляр WebApp
export function getWebApp() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp
  }
  return null
}

// Получить ID пользователя
export function getTelegramUserId(): number | null {
  const webApp = getWebApp()
  if (!webApp) return null

  // Пробуем получить из initDataUnsafe
  if (webApp.initDataUnsafe?.user?.id) {
    return webApp.initDataUnsafe.user.id
  }

  // Fallback: парсим initData
  try {
    const initData = webApp.initData
    if (initData) {
      const params = new URLSearchParams(initData)
      const userParam = params.get('user')
      if (userParam) {
        const user = JSON.parse(decodeURIComponent(userParam))
        return user.id || null
      }
    }
  } catch (e) {
    console.error('Error parsing user from initData:', e)
  }

  return null
}
