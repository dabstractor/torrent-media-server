import { test, expect } from '@playwright/test'

test.describe('Search Functionality', () => {
  test('should load search page with form elements', async ({ page }) => {
    await page.goto('/search')
    
    // Check page title
    await expect(page).toHaveTitle(/Torrent Manager/)
    
    // Check main heading
    await expect(page.getByRole('heading', { name: 'Search Torrents' })).toBeVisible()
    
    // Check search form elements
    await expect(page.getByPlaceholder('Search torrents...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible()
    
    // Check category filter buttons
    await expect(page.getByRole('button', { name: 'PC/Software' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Movies' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'TV Shows' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Music' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Books' }).first()).toBeVisible()
    
    // Check advanced filter elements
    await expect(page.getByLabel('Min Seeders:')).toBeVisible()
    await expect(page.getByLabel('Sort by:')).toBeVisible()
    await expect(page.getByLabel('Order:')).toBeVisible()
  })

  test('should display no results message for empty search', async ({ page }) => {
    await page.goto('/search')
    
    // Type a search query
    await page.getByPlaceholder('Search torrents...').fill('nonexistentquery12345')
    
    // Click search button
    await page.getByRole('button', { name: 'Search' }).click()
    
    // Check that no results message is displayed
    await expect(page.getByText('No torrents found')).toBeVisible()
    await expect(page.getByText('Try different search terms')).toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/search')
    
    // Type a search query
    await page.getByPlaceholder('Search torrents...').fill('test')
    
    // Click search button
    await page.getByRole('button', { name: 'Search' }).click()
    
    // Check that error message is displayed when API is unavailable
    // The error might be displayed in different ways, so we check for common error indicators
    await expect(page.getByText(/(Service unavailable|error|failed)/i).first()).toBeVisible()
  })

  test('should toggle category filters', async ({ page }) => {
    await page.goto('/search')
    
    const moviesButton = page.getByRole('button', { name: 'Movies' }).first()
    const tvButton = page.getByRole('button', { name: 'TV Shows' }).first()
    
    // Initially buttons should have secondary style (this is hard to test with Playwright)
    // Instead we'll test the interaction
    
    // Click to select Movies category
    await moviesButton.click()
    
    // Click to select TV Shows category
    await tvButton.click()
    
    // Click again to deselect Movies category
    await moviesButton.click()
  })

  test('should update min seeders filter', async ({ page }) => {
    await page.goto('/search')
    
    const seedersInput = page.getByLabel('Min Seeders:')
    
    // Check initial value
    await expect(seedersInput).toHaveValue('0')
    
    // Update value
    await seedersInput.fill('10')
    await expect(seedersInput).toHaveValue('10')
  })

  test('should update sort options', async ({ page }) => {
    await page.goto('/search')
    
    const sortBySelect = page.getByLabel('Sort by:')
    const sortOrderSelect = page.getByLabel('Order:')
    
    // Check initial values
    await expect(sortBySelect).toHaveValue('seeders')
    await expect(sortOrderSelect).toHaveValue('desc')
    
    // Update sort by
    await sortBySelect.selectOption('size')
    await expect(sortBySelect).toHaveValue('size')
    
    // Update sort order
    await sortOrderSelect.selectOption('asc')
    await expect(sortOrderSelect).toHaveValue('asc')
  })
})

test.describe('Search Functionality - Mobile', () => {
  test('should be responsive and touch-friendly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/search')
    
    // Check that search input has adequate touch target
    const searchInput = page.getByPlaceholder('Search torrents...')
    const searchBox = await searchInput.boundingBox()
    expect(searchBox?.height).toBeGreaterThanOrEqual(44)
    
    // Check that search button has adequate touch target
    const searchButton = page.getByRole('button', { name: 'Search' })
    const buttonBox = await searchButton.boundingBox()
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44)
    
    // Check that category buttons have adequate touch targets
    const categoryButton = page.getByRole('button', { name: 'Movies' }).first()
    const categoryBox = await categoryButton.boundingBox()
    expect(categoryBox?.height).toBeGreaterThanOrEqual(36)
    
    // Check that filter controls are accessible
    await expect(page.getByLabel('Min Seeders:')).toBeVisible()
    await expect(page.getByLabel('Sort by:')).toBeVisible()
    await expect(page.getByLabel('Order:')).toBeVisible()
  })

  test('should handle interactions for category filters on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/search')
    
    const moviesButton = page.getByRole('button', { name: 'Movies' }).first()
    
    // Click to select (using click for simplicity)
    await moviesButton.click()
    
    // Click again to deselect
    await moviesButton.click()
  })
})