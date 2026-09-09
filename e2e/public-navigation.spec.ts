import { expect, test } from '@playwright/test';

test.describe('public marketing navigation', () => {
  test('keeps the root public and navigates its sections', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /Trade with a system|Opere com um sistema|Opera con un sistema/ })).toBeVisible();
    await page.getByRole('link', { name: /Security|Segurança|Seguridad/ }).click();
    await expect(page).toHaveURL(/#security$/);
    await expect(page.locator('#security')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('switches public locale without leaving the landing page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: /Language/ }).first().selectOption('pt-BR');
    await expect(page.getByRole('heading', { name: 'Opere com um sistema que você entende.' })).toBeVisible();
    await page.getByRole('combobox', { name: /Language/ }).first().selectOption('es');
    await expect(page.getByRole('heading', { name: 'Opera con un sistema que puedes entender.' })).toBeVisible();
  });

  test('returns from login with browser back without a landing exception', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('link', { name: /Log in|Entrar|Iniciar sesión/ }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /Trade with a system|Opere con un sistema|Opera con un sistema/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('requests public pricing without a login redirect', async ({ page }) => {
    const response = await page.request.get('/api/public/plans');
    expect(response.status()).not.toBe(307);
    expect(response.url()).not.toMatch(/\/login/);
  });
});
