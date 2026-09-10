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

    const sessionResponse = await page.request.get('/auth/session');
    const strategiesResponse = await page.request.get('/api/strategies');
    const botsResponse = await page.request.get('/api/bots');
    const connectionsResponse = await page.request.get('/api/exchange-connections');
    const billingResponse = await page.request.get('/api/billing');
    for (const [endpoint, response] of [
      ['/auth/session', sessionResponse],
      ['/api/strategies', strategiesResponse],
      ['/api/bots', botsResponse],
      ['/api/exchange-connections', connectionsResponse],
      ['/api/billing', billingResponse],
    ] as const) {
      await expect(response.status(), endpoint).toBe(200);
    }
    const strategies = (await strategiesResponse.json()) as Array<{ key?: string }>;
    expect(strategies.map((strategy) => strategy.key)).toEqual(
      expect.arrayContaining(['dca', 'grid', 'trend-following']),
    );
    await expect(botsResponse.json()).resolves.toEqual([]);
    await expect(connectionsResponse.json()).resolves.toEqual([]);
    await expect(billingResponse.json()).resolves.toMatchObject({ mode: expect.any(String) });

    const routes = ['/bots', '/strategies', '/exchange-connections', '/trades', '/settings'];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    }
    await page.locator('.app-topbar select').selectOption('es');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await page.goto('/bots');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await page.goto('/settings');
    await page.locator('form.settings-grid select').first().selectOption('pt-BR');
    await page.getByRole('button', { name: /Save preferences|Salvar preferências/ }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');

    const avatar = page.getByRole('button', { name: /Open user menu/i });
    await avatar.click();
    await expect(avatar).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(
      page.getByRole('menu').getByRole('button', { name: /Sair|Sign out|Cerrar sesión/i }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.locator('[data-logout-form] button')).toHaveCount(0);
  });
});
