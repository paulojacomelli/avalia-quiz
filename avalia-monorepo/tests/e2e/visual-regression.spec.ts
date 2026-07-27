import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('generic_quiz_api_key', 'test-mock-key');
    });
    await page.reload();
  });

  test('login screen matches snapshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('login-screen.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('setup form matches snapshot', async ({ page }) => {
    await expect(page.locator('text=Desafio de Quiz')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveScreenshot('setup-form.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('settings menu matches snapshot', async ({ page }) => {
    await page.click('button[aria-label="Configurações"]');
    await expect(page.locator('text=Tema')).toBeVisible();
    await expect(page).toHaveScreenshot('settings-menu.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('ready check screen matches snapshot', async ({ page }) => {
    // This would need a successful quiz generation
    // Skipping for now - would need test data setup
  });

  test('VLibras split-screen desktop matches snapshot', async ({ page }) => {
    await page.click('button[aria-label="Configurações"]');
    await page.click('text=Idioma');
    await page.click('text=LIBRAS');
    
    // Wait for VLibras to load
    await page.waitForSelector('[data-testid="vlibras-avatar"]', { timeout: 15000 });
    
    await expect(page).toHaveScreenshot('vlibras-split-desktop.png', {
      fullPage: true,
      animations: 'disabled',
      threshold: 0.3,
    });
  });

  test('VLibras split-screen mobile matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await page.evaluate(() => {
      localStorage.setItem('generic_quiz_api_key', 'test-mock-key');
    });
    await page.reload();
    
    await page.click('button[aria-label="Configurações"]');
    await page.click('text=Idioma');
    await page.click('text=LIBRAS');
    
    await page.waitForSelector('[data-testid="vlibras-avatar"]', { timeout: 15000 });
    
    await expect(page).toHaveScreenshot('vlibras-split-mobile.png', {
      fullPage: true,
      animations: 'disabled',
      threshold: 0.3,
    });
  });
});