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
          start_param?: string
        }
        ready: () => void
        expand: () => void
        close: () => void
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void
        openTelegramLink: (url: string) => void
        showAlert: (message: string, callback?: () => void) => void
        showPopup: (params: { message: string, buttons?: Array<{ id?: string, type?: string, text: string }> }, callback?: (buttonId: string) => void) => void
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
  try {
    const webApp = getWebApp()
    if (!webApp) {
      console.warn('Telegram WebApp not available - app might not be opened through Telegram')
      return null
    }

    // Пробуем получить из initDataUnsafe (самый надёжный способ)
    if (webApp.initDataUnsafe?.user?.id) {
      const userId = webApp.initDataUnsafe.user.id
      console.log('Got telegram_id from initDataUnsafe:', userId)
      return userId
    }

    // Fallback: парсим initData
    try {
      const initData = webApp.initData
      if (initData) {
        const params = new URLSearchParams(initData)
        const userParam = params.get('user')
        if (userParam) {
          const user = JSON.parse(decodeURIComponent(userParam))
          if (user.id) {
            console.log('Got telegram_id from initData:', user.id)
            return user.id
          }
        }
      }
    } catch (e) {
      console.error('Error parsing user from initData:', e)
    }

    console.warn('Could not extract telegram_id from WebApp')
    return null
  } catch (error) {
    console.error('Error getting telegram_id:', error)
    return null
  }
}

// Получить username пользователя (может быть null, если пользователь не установил username)
export function getTelegramUsername(): string | null {
  try {
    const webApp = getWebApp()
    if (!webApp) {
      return null
    }

    // Пробуем получить из initDataUnsafe
    if (webApp.initDataUnsafe?.user?.username) {
      const username = webApp.initDataUnsafe.user.username
      console.log('Got telegram username from initDataUnsafe:', username)
      return username
    }

    // Fallback: парсим initData
    try {
      const initData = webApp.initData
      if (initData) {
        const params = new URLSearchParams(initData)
        const userParam = params.get('user')
        if (userParam) {
          const user = JSON.parse(decodeURIComponent(userParam))
          if (user.username) {
            console.log('Got telegram username from initData:', user.username)
            return user.username
          }
        }
      }
    } catch (e) {
      console.error('Error parsing username from initData:', e)
    }

    return null
  } catch (error) {
    console.error('Error getting telegram username:', error)
    return null
  }
}
