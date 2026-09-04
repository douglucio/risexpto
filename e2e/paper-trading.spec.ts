import { expect, test } from '@playwright/test';

test.skip(!process.env.E2E_STORAGE_STATE, 'Set E2E_STORAGE_STATE to an authenticated Playwright storage state');

test.describe('Paper Trading browser flow', () => {
  test('operates a PAPER bot through its lifecycle', async ({ page }) => {
    await page.goto('/bots');
    await expect(page.getByRole('heading', { name: 'Bots' })).toBeVisible();
    const bot = page.locator('tr').filter({ hasText: process.env.E2E_BOT_NAME ?? 'E2E' }).first();
    await expect(bot).toBeVisible();
    await bot.getByRole('button', { name: 'Start' }).click();
    await expect(bot.getByRole('button', { name: 'Run cycle' })).toBeVisible();
    await bot.getByRole('button', { name: 'Run cycle' }).click();
    await expect(bot).toContainText('Paper cycle queued.');
    await bot.getByRole('button', { name: 'Pause' }).click();
    await expect(bot.getByRole('button', { name: 'Resume' })).toBeVisible();
    await bot.getByRole('button', { name: 'Resume' }).click();
    await expect(bot.getByRole('button', { name: 'Pause' })).toBeVisible();
    await bot.getByRole('button', { name: 'Stop' }).click();
  });
});
