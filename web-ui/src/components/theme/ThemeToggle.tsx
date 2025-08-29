'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <button 
        className="w-10 h-10 min-h-[44px] rounded-lg bg-gray-100 dark:bg-gray-800 transition-colors flex items-center justify-center"
        disabled 
        aria-label="Theme toggle loading"
      />
    )
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-5 h-5" />
      case 'dark':
        return <Moon className="w-5 h-5" />
      default:
        return <Monitor className="w-5 h-5" />
    }
  }

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Switch to dark theme'
      case 'dark':
        return 'Switch to system theme'
      default:
        return 'Switch to light theme'
    }
  }

  const getThemeDescription = () => {
    switch (theme) {
      case 'light':
        return 'Light theme active'
      case 'dark':
        return 'Dark theme active'
      default:
        return 'System theme active'
    }
  }

  return (
    <button
      onClick={cycleTheme}
      className="w-10 h-10 min-h-[44px] rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      aria-label={getLabel()}
      title={`${getThemeDescription()}. ${getLabel()}`}
    >
      {getIcon()}
    </button>
  )
}