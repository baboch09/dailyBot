const STORAGE_KEY = 'habit-tracker-theme'

export type ThemeValue = 'light' | 'dark' | 'system'

function getSystemDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyDark(dark: boolean) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (dark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function getStoredTheme(): ThemeValue {
  if (typeof localStorage === 'undefined') return 'system'
  return (localStorage.getItem(STORAGE_KEY) as ThemeValue) || 'system'
}

export function setTheme(value: ThemeValue) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, value)
  }
  const dark = value === 'system' ? getSystemDark() : value === 'dark'
  applyDark(dark)
}

export function initTheme() {
  const stored = getStoredTheme()
  const dark = stored === 'system' ? getSystemDark() : stored === 'dark'
  applyDark(dark)
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getStoredTheme() === 'system') applyDark(getSystemDark())
    })
  }
}
