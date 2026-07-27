import { test, expect } from '@playwright/test';

test.describe('Quiz Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load login screen', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Avalia Quiz');
    await expect(page.locator('text=Chave da API')).toBeVisible();
  });

  test('should navigate to prebuilt quiz library', async ({ page }) => {
    await page.click('text=Quiz da Biblioteca');
    await expect(page.locator('text=Temas Disponíveis')).toBeVisible();
  });

  test('should show settings menu', async ({ page }) => {
    await page.click('button[aria-label="Configurações"]');
    await expect(page.locator('text=Tema')).toBeVisible();
    await expect(page.locator('text=Sons')).toBeVisible();
    await expect(page.locator('text=Narração')).toBeVisible();
  });

  test('should toggle theme', async ({ page }) => {
    await page.click('button[aria-label="Configurações"]');
    await page.click('text=Tema');
    await page.click('text=Claro');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});

test.describe('VLibras Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have VLibras language option in settings', async ({ page }) => {
    await page.click('button[aria-label="Configurações"]');
    await expect(page.locator('text=LIBRAS')).toBeVisible();
  });

  test('should show split-screen layout when LIBRAS enabled', async ({ page }) => {
    await page.click('button[aria-label="Configurações"]');
    await page.click('text=Idioma');
    await page.click('text=LIBRAS');
    
    // App should reload with LIBRAS mode
    await expect(page.locator('[data-testid="vlibras-avatar"]')).toBeVisible({ timeout: 10000 });
  });
});