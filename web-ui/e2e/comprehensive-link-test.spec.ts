import { test, expect } from '@playwright/test'

test.describe('Comprehensive Link Testing', () => {
  test('should visit all main navigation links and capture errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`Console error: ${msg.text()}`);
      }
    });

    page.on('pageerror', (error) => {
      errors.push(`Page error: ${error.message}`);
    });

    page.on('response', (response) => {
      if (response.status() >= 400) {
        errors.push(`HTTP ${response.status()} error on ${response.url()}`);
      }
    });

    // Start from homepage
    await page.goto('/');
    
    // Test main navigation links from homepage cards
    const mainLinks = ['/search', '/downloads', '/settings'];
    
    for (const link of mainLinks) {
      console.log(`Visiting ${link}`);
      await page.goto(link);
      await expect(page).toHaveURL(link);
      
      // Wait a bit for any async errors to surface
      await page.waitForTimeout(1000);
    }
    
    // Test main navigation links from header/sidebar
    const navLinks = ['/search', '/downloads', '/completed', '/status'];
    
    // Test header navigation (desktop)
    await page.goto('/');
    await page.setViewportSize({ width: 1024, height: 768 }); // Desktop size
    
    for (const link of navLinks) {
      console.log(`Testing header navigation to ${link}`);
      try {
        await page.getByRole('link', { name: link.substring(1), exact: true }).click({ timeout: 5000 });
        await expect(page).toHaveURL(link);
        await page.waitForTimeout(1000);
        await page.goBack();
      } catch (e) {
        errors.push(`Failed to navigate to ${link} via header: ${e}`);
      }
    }
    
    // Test mobile sidebar navigation
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile size
    await page.goto('/');
    
    // Open sidebar
    await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
    
    for (const link of navLinks) {
      console.log(`Testing mobile navigation to ${link}`);
      try {
        // Reopen sidebar for each link
        await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
        await page.getByRole('link', { name: link.substring(1), exact: true }).click({ timeout: 5000 });
        await expect(page).toHaveURL(link);
        await page.waitForTimeout(1000);
        await page.goBack();
      } catch (e) {
        errors.push(`Failed to navigate to ${link} via mobile sidebar: ${e}`);
      }
    }
    
    // Test settings sub-navigation
    console.log('Testing settings sub-navigation');
    await page.goto('/settings');
    
    const settingsSections = [
      'general', 'download', 'bandwidth', 'qbittorrent', 
      'plex', 'advanced', 'backup'
    ];
    
    for (const section of settingsSections) {
      console.log(`Testing settings section: ${section}`);
      try {
        await page.getByRole('button', { name: section, exact: true }).click({ timeout: 5000 });
        await page.waitForTimeout(500); // Wait for section to load
      } catch (e) {
        errors.push(`Failed to navigate to settings section ${section}: ${e}`);
      }
    }
    
    // Test backup management sub-tabs
    console.log('Testing backup management tabs');
    const backupTabs = ['backups', 'create', 'import'];
    
    for (const tab of backupTabs) {
      console.log(`Testing backup tab: ${tab}`);
      try {
        await page.getByRole('button', { name: tab, exact: true }).click({ timeout: 5000 });
        await page.waitForTimeout(500); // Wait for tab to load
      } catch (e) {
        errors.push(`Failed to navigate to backup tab ${tab}: ${e}`);
      }
    }
    
    // Report any errors found
    if (errors.length > 0) {
      console.log(`\n=== ERRORS FOUND (${errors.length}) ===`);
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      // Fail the test if we found errors
      expect(errors.length).toBe(0);
    } else {
      console.log('\n=== NO ERRORS FOUND ===');
    }
  });
});