import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load and display navigation options', async ({ page }) => {
    await page.goto('/')

    // Check page title
    await expect(page).toHaveTitle(/Torrent Manager/)

    // Check main heading
    await expect(page.getByRole('heading', { name: 'Torrent Manager' })).toBeVisible()

    // Check navigation cards
    await expect(page.getByRole('main').getByRole('link', { name: /search/i })).toBeVisible()
    await expect(page.getByRole('main').getByRole('link', { name: /downloads/i })).toBeVisible()
    await expect(page.getByRole('main').getByRole('link', { name: /settings/i })).toBeVisible()
  })

  test('should navigate to search page', async ({ page }) => {
    await page.goto('/')
    
    await page.getByRole('main').getByRole('link', { name: /search/i }).click()
    await expect(page).toHaveURL('/search')
  })

  test('should navigate to downloads page', async ({ page }) => {
    await page.goto('/')
    
    await page.getByRole('main').getByRole('link', { name: /downloads/i }).click()
    await expect(page).toHaveURL('/downloads')
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Check that navigation cards are stacked vertically and touch-friendly
    const searchCard = page.getByRole('main').getByRole('link', { name: /search/i })
    const downloadCard = page.getByRole('main').getByRole('link', { name: /downloads/i })
    
    await expect(searchCard).toBeVisible()
    await expect(downloadCard).toBeVisible()
    
    // Ensure cards have adequate touch targets (minimum 44px height)
    const searchBox = await searchCard.boundingBox()
    const downloadBox = await downloadCard.boundingBox()
    
    expect(searchBox?.height).toBeGreaterThanOrEqual(44)
    expect(downloadBox?.height).toBeGreaterThanOrEqual(44)
  })
})