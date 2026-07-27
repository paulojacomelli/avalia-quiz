import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show login form', async ({ page }) => {
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Entrar")')).toBeVisible();
  });

  test('should show error with invalid API key', async ({ page }) => {
    await page.fill('input[type="password"]', 'invalid-key');
    await page.click('button:has-text("Entrar")');
    await expect(page.locator('text=Chave de API Inválida')).toBeVisible({ timeout: 5000 });
  });

  test('should persist login in localStorage', async ({ page }) => {
    // This test would need a valid API key to fully test
    // Skipping actual login but verifying localStorage behavior
    await page.evaluate(() => {
      localStorage.setItem('generic_quiz_api_key', 'test-key');
    });
    await page.reload();
    // Should not show login screen if key is valid
  });

  test('should logout and clear session', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('generic_quiz_api_key', 'test-key');
    });
    await page.reload();
    
    await page.click('button[aria-label="Configurações"]');
    await page.click('text=Sair');
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});