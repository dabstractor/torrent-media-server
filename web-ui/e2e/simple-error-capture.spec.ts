import { test, expect } from '@playwright/test'

test.describe('Simple Error Capture', () => {
  test('should visit all pages and capture console errors', async ({ page }) => {
    // Capture all errors
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`[Console Error] ${msg.text()} - URL: ${page.url()}`);
      }
    });

    page.on('pageerror', (error) => {
      errors.push(`[Page Error] ${error.message} - URL: ${page.url()}`);
    });

    page.on('response', (response) => {
      if (response.status() >= 400) {
        errors.push(`[HTTP Error] ${response.status()} ${response.statusText()} - URL: ${response.url()}`);
      }
    });

    page.on('requestfailed', (request) => {
      errors.push(`[Request Failed] ${request.failure()?.errorText} - URL: ${request.url()}`);
    });

    // List of all pages to visit
    const pages = [
      '/',
      '/search',
      '/downloads',
      '/completed',
      '/status',
      '/settings',
      '/files',
    ];

    console.log('Visiting all pages to capture errors...');
    
    for (const url of pages) {
      console.log(`Visiting ${url}`);
      try {
        await page.goto(url, { waitUntil: 'networkidle' });
        // Wait a bit for any async errors to surface
        await page.waitForTimeout(2000);
      } catch (e) {
        errors.push(`[Navigation Error] Failed to visit ${url}: ${e}`);
      }
    }

    // Visit settings sections
    console.log('Testing settings sections...');
    await page.goto('/settings');
    
    const settingsSections = [
      'General', 'Download', 'Bandwidth', 'qBittorrent', 
      'Plex Integration', 'Advanced', 'Backup & Restore'
    ];
    
    for (const sectionName of settingsSections) {
      try {
        console.log(`Clicking ${sectionName} section`);
        await page.getByRole('button', { name: sectionName }).click({ timeout: 5000 });
        await page.waitForTimeout(1000);
      } catch (e) {
        errors.push(`[Settings Error] Failed to click ${sectionName} section: ${e}`);
      }
    }

    // Visit backup management tabs
    console.log('Testing backup management tabs...');
    const backupTabs = ['Existing Backups', 'Create Backup', 'Import/Export'];
    
    for (const tabName of backupTabs) {
      try {
        console.log(`Clicking ${tabName} tab`);
        await page.getByRole('button', { name: tabName }).click({ timeout: 5000 });
        await page.waitForTimeout(1000);
      } catch (e) {
        errors.push(`[Backup Error] Failed to click ${tabName} tab: ${e}`);
      }
    }

    // Print all errors found
    console.log(`\n=== ERRORS FOUND (${errors.length}) ===`);
    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
    
    // Save errors to a file for later reference
    const fs = require('fs');
    const path = require('path');
    const errorReport = `# Error Report\n\n## Errors Found\n\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n`;
    fs.writeFileSync(path.join(__dirname, '../test-results/error-report.txt'), errorReport);
    
    // Fail if we found errors (to make the test result visible)
    if (errors.length > 0) {
      expect(errors.length).toBe(0);
    }
  });
});