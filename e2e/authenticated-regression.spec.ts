import { expect, test } from '@playwright/test';

const username = process.env.E2E_AUTH_USERNAME;
const password = process.env.E2E_AUTH_PASSWORD;

test.skip(
  !username || !password,
  'Set E2E_AUTH_USERNAME and E2E_AUTH_PASSWORD for a local verified Keycloak user',
);

test.describe('authenticated auth and locale regression', () => {
  test('keeps the selected locale and authenticated API data across workspace routes', async ({
    page,
  }) => {
    await page.goto('/login?locale=pt-BR');
    await page.getByRole('link', { name: /Sign in|Entrar|Iniciar sesión/ }).click();
    await page.waitForURL(/127\.0\.0\.1:8080|localhost:8080/);
    await page.locator('#username').fill(username!);
    await page.locator('#password').fill(password!);
    await page.locator('input[type="submit"], button[type="submit"]').first().click();
    await page.waitForURL(/\/dashboard$/);

    for (const endpoint of [
      '/auth/session',
      '/api/strategies',
      '/api/bots',
      '/api/exchange-connections',
      '/api/billing',
    ]) {
      await expect((await page.request.get(endpoint)).status(), endpoint).toBe(200);
    }

    const routes = ['/bots', '/strategies', '/exchange-connections', '/trades', '/settings'];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    }
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });
});
