# Next.js App Router + next-themes Integration Guide

## Overview

This guide provides comprehensive instructions for integrating `next-themes` with Next.js App Router to implement dark theme functionality without common pitfalls like FOUC (Flash of Unstyled Content) or hydration mismatches.

## Installation & Setup

### 1. Install Dependencies

```bash
npm install next-themes
```

### 2. Theme Provider Setup

**File**: `src/components/theme/ThemeProvider.tsx`

```typescript
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"        // Use data-theme instead of class
      defaultTheme="system"         // Respect system preference by default
      enableSystem={true}           // Enable system theme detection
      themes={['light', 'dark']}    // Available themes
      storageKey="app-theme"        // Local storage key
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
```

**Key Configuration Options**:
- `attribute="data-theme"`: Uses `data-theme` attribute instead of `class="dark"` for better CSS specificity
- `enableSystem={true}`: Automatically detects `prefers-color-scheme` 
- `defaultTheme="system"`: Respects user's OS preference initially
- `storageKey`: Customize localStorage key for theme persistence

### 3. Root Layout Integration

**File**: `src/app/layout.tsx`

```typescript
import { ThemeProvider } from '@/components/theme/ThemeProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Critical Details**:
- `suppressHydrationWarning`: Prevents hydration warnings during theme initialization
- Theme provider wraps all content to ensure consistent theme context

## FOUC Prevention

### Method 1: Script in Document (Recommended)

**File**: `src/app/_document.tsx` (if using Pages Router) or inline script in `layout.tsx`

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('app-theme') || 'system';
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                const resolvedTheme = theme === 'system' ? systemTheme : theme;
                
                document.documentElement.setAttribute('data-theme', resolvedTheme);
                
                // Optional: Add class-based approach for Tailwind
                if (resolvedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Method 2: CSS-Only Approach

If using `data-theme` attribute, update Tailwind config:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'], // Support both approaches
  // ... rest of config
}
```

## Theme Toggle Component

### Basic Implementation

```typescript
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Only render after mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-md border border-gray-200 dark:border-gray-700"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  )
}
```

### Advanced Multi-Theme Toggle

```typescript
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-9 h-9" /> // Placeholder to prevent layout shift
  }

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const getIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="h-5 w-5" />
      case 'dark': return <Moon className="h-5 w-5" />
      default: return <Monitor className="h-5 w-5" />
    }
  }

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-md border border-gray-200 dark:border-gray-700 transition-colors"
      aria-label={`Current theme: ${theme}. Click to change.`}
    >
      {getIcon()}
    </button>
  )
}
```

## CSS Theme Styling

### Tailwind CSS Setup

Update `tailwind.config.js` to support your theme approach:

```javascript
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // or ['class', '[data-theme="dark"]']
  theme: {
    extend: {
      // Custom color scheme for better dark theme contrast
      colors: {
        background: {
          light: '#ffffff',
          dark: '#121212',
        },
        foreground: {
          light: '#000000', 
          dark: '#ffffff',
        },
        // Add semantic colors
        card: {
          light: '#ffffff',
          dark: '#1e1e1e',
        },
      },
    },
  },
  plugins: [],
}
```

### Global CSS Setup

**File**: `src/app/globals.css`

```css
@tailwind base;
@tailwind components; 
@tailwind utilities;

/* Theme transition for smooth switching */
* {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

/* Root theme variables */
:root {
  color-scheme: light;
}

[data-theme='dark'] {
  color-scheme: dark;
}

/* Utility classes with theme support */
@layer components {
  .card {
    @apply bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm;
  }
  
  .btn-primary {
    @apply bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors;
  }
  
  .input {
    @apply bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
  }
}
```

## Common Pitfalls & Solutions

### 1. Hydration Mismatch

**Problem**: Theme-dependent content renders differently on server vs client

**Solution**: Always check `mounted` state before rendering theme-specific content

```typescript
if (!mounted) return null // or return a placeholder
```

### 2. Flash of Unstyled Content (FOUC)

**Problem**: Brief flash of wrong theme during page load

**Solution**: Use blocking script in `<head>` to set theme immediately

### 3. Theme Not Persisting

**Problem**: Theme resets on page refresh

**Solution**: Ensure `storageKey` is properly configured and localStorage is available

```typescript
// Check if localStorage is available
const hasLocalStorage = typeof window !== 'undefined' && window.localStorage
```

### 4. Theme Toggle Not Working

**Problem**: Theme toggle doesn't change appearance

**Solution**: Verify Tailwind's `darkMode` configuration and CSS class application

## Testing

### Unit Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'
import { ThemeToggle } from './ThemeToggle'

test('theme toggle changes theme', async () => {
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  )

  const toggle = screen.getByRole('button')
  fireEvent.click(toggle)
  
  // Add assertions based on your implementation
})
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test'

test('theme persists across page reloads', async ({ page }) => {
  await page.goto('/')
  
  // Toggle to dark theme
  await page.click('[aria-label*="dark mode"]')
  
  // Verify dark theme applied
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  
  // Reload page
  await page.reload()
  
  // Verify theme persisted
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
```

## Performance Optimization

### Reduce Bundle Size

Tree-shake unused theme functionality:

```typescript
// Import only what you need
import { useTheme } from 'next-themes'
// Instead of: import * as themes from 'next-themes'
```

### Optimize Theme Transitions

Use CSS transitions sparingly to avoid performance issues:

```css
/* Only transition specific properties */
.theme-transition {
  transition: background-color 200ms ease, color 200ms ease;
}

/* Avoid transitioning everything */
.avoid {
  transition: all 200ms ease; /* Don't do this */
}
```

## Advanced Features

### Custom Theme Colors

```typescript
const themes = {
  light: {
    background: '#ffffff',
    foreground: '#000000',
    card: '#f8f9fa',
  },
  dark: {
    background: '#121212',
    foreground: '#ffffff', 
    card: '#1e1e1e',
  },
  blue: {
    background: '#1e3a8a',
    foreground: '#ffffff',
    card: '#1e40af',
  },
}
```

### System Theme Detection

```typescript
useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const handleChange = (e: MediaQueryListEvent) => {
    if (theme === 'system') {
      // Update theme when system preference changes
      setTheme('system')
    }
  }
  
  mediaQuery.addListener(handleChange)
  return () => mediaQuery.removeListener(handleChange)
}, [theme, setTheme])
```

This integration guide ensures proper setup of dark theme functionality with Next.js App Router while avoiding common implementation issues.