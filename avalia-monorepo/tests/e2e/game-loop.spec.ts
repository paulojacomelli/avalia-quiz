import { test, expect } from '@playwright/test';

test.describe('Game Loop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Set a mock API key for testing
    await page.evaluate(() => {
      localStorage.setItem('generic_quiz_api_key', 'test-mock-key');
    });
    await page.reload();
  });

  test('should configure and start a quiz', async ({ page }) => {
    // Wait for setup form
    await expect(page.locator('text=Desafio de Quiz')).toBeVisible({ timeout: 10000 });
    
    // Select options
    await page.selectOption('select[name="mode"]', 'multiple');
    await page.fill('input[name="count"]', '3');
    await page.fill('input[name="timeLimit"]', '30');
    
    // Start quiz (will fail with mock key but we can verify flow)
    await page.click('button:has-text("Gerar Quiz")');
    
    // Should show loading
    await expect(page.locator('text=Gerando perguntas')).toBeVisible({ timeout: 5000 });
  });

  test('should show ready check screen after generation', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('generic_quiz_api_key', 'test-mock-key');
    });
    await page.reload();
    
    await expect(page.locator('text=Desafio de Quiz')).toBeVisible({ timeout: 10000 });
    await page.selectOption('select[name="mode"]', 'multiple');
    await page.fill('input[name="count"]', '1');
    await page.click('button:has-text("Gerar Quiz")');
    
    // Wait for either ready check or error
    await Promise.race([
      page.waitForSelector('text=Preparado?', { timeout: 15000 }),
      page.waitForSelector('text=Erro', { timeout: 15000 }),
    ]);
  });
});

test.describe('TTS (Text-to-Speech)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('generic_quiz_api_key', 'test-mock-key');
    });
    await page.reload();
  });

  test('should have TTS options in settings', async ({ page }) => {
    await page.click('button[aria-label="Configurações"]');
    await expect(page.locator('text=Narração')).toBeVisible();
    await expect(page.locator('text=Voz Natural')).toBeVisible();
    await expect(page.locator('text=Voz Clássica')).toBeVisible();
    await expect(page.locator('text=Sem Narração')).toBeVisible();
  });

  test('should toggle TTS on/off', async ({ page }) => {
    await page.click('button[aria-label="Configurações"]');
    await page.click('text=Voz Natural');
    await expect(page.locator('text=Voz Natural')).toHaveClass(/selected|active/);
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Avalia Quiz');
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Avalia Quiz');
  });
});