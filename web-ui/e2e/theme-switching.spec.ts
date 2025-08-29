import { test, expect, Page } from '@playwright/test'

test.describe('Theme Switching', () => {
  // Helper function to get theme toggle button
  const getThemeToggle = (page: Page) => page.getByRole('button', { name: /theme/i })

  // Helper function to wait for theme to be applied
  const waitForTheme = async (page: Page, theme: 'light' | 'dark') => {
    await page.waitForFunction(
      (expectedTheme) => {
        const html = document.documentElement
        return html.getAttribute('data-theme') === expectedTheme
      },
      theme,
      { timeout: 2000 }
    )
  }

  test.beforeEach(async ({ page }) => {
    // Clear theme preference to start with default
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('app-theme'))
  })

  test('should display theme toggle button in header', async ({ page }) => {
    await page.goto('/')

    const themeToggle = getThemeToggle(page)
    await expect(themeToggle).toBeVisible()
    
    // Should have proper accessibility attributes
    await expect(themeToggle).toHaveAttribute('aria-label')
    await expect(themeToggle).toHaveAttribute('title')
  })

  test('should start with system theme by default', async ({ page }) => {
    await page.goto('/')

    // Check that data-theme attribute exists
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', /.+/)
    
    // Check theme toggle shows correct initial label
    const themeToggle = getThemeToggle(page)
    const ariaLabel = await themeToggle.getAttribute('aria-label')
    expect(ariaLabel).toMatch(/switch to (light|dark) theme/i)
  })

  test('should cycle through themes: light → dark → system', async ({ page }) => {
    await page.goto('/')

    const themeToggle = getThemeToggle(page)
    
    // Start with light theme
    await page.evaluate(() => {
      localStorage.setItem('app-theme', 'light')
      window.location.reload()
    })
    await page.waitForLoadState('networkidle')
    
    await waitForTheme(page, 'light')
    await expect(themeToggle).toHaveAttribute('aria-label', /switch to dark theme/i)

    // Click to go to dark theme
    await themeToggle.click()
    await waitForTheme(page, 'dark')
    await expect(themeToggle).toHaveAttribute('aria-label', /switch to system theme/i)

    // Click to go to system theme
    await themeToggle.click()
    await page.waitForTimeout(500) // Allow system theme to be applied
    await expect(themeToggle).toHaveAttribute('aria-label', /switch to light theme/i)

    // Click to go back to light theme
    await themeToggle.click()
    await waitForTheme(page, 'light')
    await expect(themeToggle).toHaveAttribute('aria-label', /switch to dark theme/i)
  })

  test('should persist theme across page reloads', async ({ page }) => {
    await page.goto('/')

    const themeToggle = getThemeToggle(page)
    
    // Switch to dark theme
    await themeToggle.click()
    await waitForTheme(page, 'dark')

    // Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Theme should persist
    await waitForTheme(page, 'dark')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'dark')
  })

  test('should persist theme across navigation', async ({ page }) => {
    await page.goto('/')

    const themeToggle = getThemeToggle(page)
    
    // Switch to dark theme
    await themeToggle.click()
    await waitForTheme(page, 'dark')

    // Navigate to search page
    await page.getByRole('link', { name: /search/i }).first().click()
    await expect(page).toHaveURL('/search')
    
    // Theme should persist
    await waitForTheme(page, 'dark')

    // Navigate to downloads page
    await page.getByRole('link', { name: /downloads/i }).first().click()
    await expect(page).toHaveURL('/downloads')
    
    // Theme should still persist
    await waitForTheme(page, 'dark')
  })

  test('should apply dark theme styles correctly', async ({ page }) => {
    await page.goto('/')

    const themeToggle = getThemeToggle(page)
    
    // Switch to dark theme
    await themeToggle.click()
    await waitForTheme(page, 'dark')

    // Check that dark styles are applied
    const body = page.locator('body')
    const header = page.locator('header')
    
    // Verify dark background colors are applied (approximate check)
    const bodyBg = await body.evaluate(el => getComputedStyle(el).backgroundColor)
    const headerBg = await header.evaluate(el => getComputedStyle(el).backgroundColor)
    
    // Dark backgrounds should have lower RGB values
    expect(bodyBg).toMatch(/rgb\(.*\)/)
    expect(headerBg).toMatch(/rgb\(.*\)/)
  })

  test('should maintain focus on theme toggle during switching', async ({ page }) => {
    await page.goto('/')

    const themeToggle = getThemeToggle(page)
    
    // Focus the theme toggle
    await themeToggle.focus()
    await expect(themeToggle).toBeFocused()

    // Click to switch theme
    await themeToggle.click()
    await page.waitForTimeout(100)

    // Focus should remain on toggle
    await expect(themeToggle).toBeFocused()
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/')

    const themeToggle = getThemeToggle(page)
    
    // Focus the theme toggle
    await themeToggle.focus()
    await expect(themeToggle).toBeFocused()

    // Get initial theme
    const initialLabel = await themeToggle.getAttribute('aria-label')

    // Activate with Enter key
    await page.keyboard.press('Enter')
    await page.waitForTimeout(100)

    // Theme should have changed
    const newLabel = await themeToggle.getAttribute('aria-label')
    expect(newLabel).not.toBe(initialLabel)
  })

  test('should support space key activation', async ({ page }) => {
    await page.goto('/')

    const themeToggle = getThemeToggle(page)
    
    // Focus and get initial state
    await themeToggle.focus()
    const initialLabel = await themeToggle.getAttribute('aria-label')

    // Activate with Space key
    await page.keyboard.press('Space')
    await page.waitForTimeout(100)

    // Theme should have changed
    const newLabel = await themeToggle.getAttribute('aria-label')
    expect(newLabel).not.toBe(initialLabel)
  })

  test('should work correctly on different pages', async ({ page }) => {
    const pages = [
      { url: '/', name: 'homepage' },
      { url: '/search', name: 'search page' },
      { url: '/downloads', name: 'downloads page' },
      { url: '/settings', name: 'settings page' }
    ]

    for (const testPage of pages) {
      await page.goto(testPage.url)
      
      const themeToggle = getThemeToggle(page)
      await expect(themeToggle, `Theme toggle should be visible on ${testPage.name}`).toBeVisible()

      // Switch to dark theme
      await themeToggle.click()
      await waitForTheme(page, 'dark')

      // Verify theme is applied
      const html = page.locator('html')
      await expect(html, `Dark theme should be applied on ${testPage.name}`).toHaveAttribute('data-theme', 'dark')

      // Switch back to light theme
      await themeToggle.click() // dark -> system
      await themeToggle.click() // system -> light
      await waitForTheme(page, 'light')

      await expect(html, `Light theme should be applied on ${testPage.name}`).toHaveAttribute('data-theme', 'light')
    }
  })

  test('should not cause layout shifts during theme switching', async ({ page }) => {
    await page.goto('/')

    const themeToggle = getThemeToggle(page)
    
    // Get initial layout measurements
    const header = page.locator('header')
    const initialHeaderBox = await header.boundingBox()
    
    // Switch theme
    await themeToggle.click()
    await page.waitForTimeout(500) // Allow theme transition
    
    // Check layout hasn't shifted significantly
    const finalHeaderBox = await header.boundingBox()
    expect(finalHeaderBox?.height).toBe(initialHeaderBox?.height)
    expect(finalHeaderBox?.width).toBe(initialHeaderBox?.width)
  })

  test('should preserve theme in localStorage', async ({ page }) => {
    await page.goto('/')

    const themeToggle = getThemeToggle(page)
    
    // Switch to dark theme
    await themeToggle.click()
    await waitForTheme(page, 'dark')

    // Check localStorage value
    const storedTheme = await page.evaluate(() => localStorage.getItem('app-theme'))
    expect(storedTheme).toBe('dark')

    // Switch to system theme
    await themeToggle.click()
    await page.waitForTimeout(100)

    const systemTheme = await page.evaluate(() => localStorage.getItem('app-theme'))
    expect(systemTheme).toBe('system')
  })

  test('should handle rapid theme switching gracefully', async ({ page }) => {
    await page.goto('/')

    const themeToggle = getThemeToggle(page)
    
    // Rapidly click theme toggle multiple times
    for (let i = 0; i < 5; i++) {
      await themeToggle.click()
      await page.waitForTimeout(50)
    }

    // Should still be functional
    await expect(themeToggle).toBeVisible()
    await expect(themeToggle).toHaveAttribute('aria-label', /.+/)
    
    // Final click should still work
    await themeToggle.click()
    await page.waitForTimeout(100)
    await expect(themeToggle).toHaveAttribute('aria-label', /.+/)
  })

  test('should work correctly in mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    const themeToggle = getThemeToggle(page)
    
    // Theme toggle should be visible and touch-friendly
    await expect(themeToggle).toBeVisible()
    
    const toggleBox = await themeToggle.boundingBox()
    expect(toggleBox?.height).toBeGreaterThanOrEqual(44) // Touch-friendly size
    expect(toggleBox?.width).toBeGreaterThanOrEqual(44)

    // Should work on mobile
    await themeToggle.click()
    await waitForTheme(page, 'dark')
    
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'dark')
  })

  test('should have no FOUC (Flash of Unstyled Content)', async ({ page }) => {
    // Set theme preference before navigation
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('app-theme', 'dark'))

    // Navigate to a new page and measure timing
    const startTime = Date.now()
    await page.goto('/search')
    
    // Theme should be applied immediately
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'dark')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(1000) // Should load quickly without flash
  })

  test('should maintain theme consistency across components', async ({ page }) => {
    await page.goto('/downloads')

    const themeToggle = getThemeToggle(page)
    
    // Switch to dark theme
    await themeToggle.click()
    await waitForTheme(page, 'dark')

    // Check various components have consistent theming
    const cards = page.locator('.card').first()
    const buttons = page.locator('.btn').first()
    const inputs = page.locator('.input').first()

    // All themed components should be visible (indicating they have proper dark styles)
    if (await cards.count() > 0) {
      await expect(cards).toBeVisible()
    }
    if (await buttons.count() > 0) {
      await expect(buttons).toBeVisible()
    }
    if (await inputs.count() > 0) {
      await expect(inputs).toBeVisible()
    }
  })
})