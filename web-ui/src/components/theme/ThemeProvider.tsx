'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem={true}
      themes={['light', 'dark', 'system']}
      storageKey="app-theme"
      forcedTheme="system"
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}