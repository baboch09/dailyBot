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
  try {
    // Проверяем доступность window
    if (typeof window === 'undefined') {
      console.warn('[Telegram] window is undefined (SSR)')
      return null
    }

    // Проверяем наличие Telegram SDK
    if (!window.Telegram) {
      console.warn('[Telegram] window.Telegram is not available')
      console.log('[Telegram] Available in window:', Object.keys(window).filter(k => k.toLowerCase().includes('telegram')))
      return null
    }

    const webApp = getWebApp()
    if (!webApp) {
      console.warn('[Telegram] WebApp not available - app might not be opened through Telegram')
      console.log('[Telegram] window.Telegram:', window.Telegram)
      return null
    }

    console.log('[Telegram] WebApp available:', {
      hasInitData: !!webApp.initData,
      hasInitDataUnsafe: !!webApp.initDataUnsafe,
      initDataLength: webApp.initData?.length || 0
    })

    // Пробуем получить из initDataUnsafe (самый надёжный способ)
    if (webApp.initDataUnsafe?.user?.id) {
      const userId = webApp.initDataUnsafe.user.id
      console.log('[Telegram] ✅ Got telegram_id from initDataUnsafe:', userId)
      return userId
    }

    // Fallback: парсим initData
    try {
      const initData = webApp.initData
      console.log('[Telegram] Attempting to parse initData:', {
        exists: !!initData,
        length: initData?.length || 0,
        preview: initData?.substring(0, 100) || 'empty'
      })
      
      if (initData) {
        const params = new URLSearchParams(initData)
        const userParam = params.get('user')
        console.log('[Telegram] User param from initData:', userParam ? 'exists' : 'missing')
        
        if (userParam) {
          const user = JSON.parse(decodeURIComponent(userParam))
          console.log('[Telegram] Parsed user object:', user)
          if (user.id) {
            console.log('[Telegram] ✅ Got telegram_id from initData:', user.id)
            return user.id
          }
        }
      }
    } catch (e) {
      console.error('[Telegram] ❌ Error parsing user from initData:', e)
    }

    console.warn('[Telegram] ⚠️ Could not extract telegram_id from WebApp')
    console.log('[Telegram] Full WebApp object:', {
      initData: webApp.initData,
      initDataUnsafe: webApp.initDataUnsafe
    })
    return null
  } catch (error) {
    console.error('[Telegram] ❌ Error getting telegram_id:', error)
    return null
  }
}
