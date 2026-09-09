import { expect, test } from '@playwright/test';

test.describe('public marketing navigation', () => {
  test('keeps the root public and navigates its sections', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /Trade with a system|Opere com um sistema|Opera con un sistema/ })).toBeVisible();
    await page.getByRole('link', { name: /Security|Segurança|Seguridad/ }).click();
    await expect(page).toHaveURL(/#security$/);
    await expect(page.locator('#security')).toBeVisible();
  });

  test('switches public locale without leaving the landing page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Language' }).first().selectOption('pt-BR');
    await expect(page.getByRole('heading', { name: 'Opere com um sistema que você entende.' })).toBeVisible();
  });
});
