import { expect, test } from '@playwright/test';

async function openKeycloakLogin(page: import('@playwright/test').Page) {
  await page.goto('/login?locale=en');
  await page.getByRole('link', { name: /Sign in|Entrar|Iniciar sesión/ }).click();
  await page.waitForURL(/localhost:8080/);
}

async function expectAuthLayout(page: import('@playwright/test').Page) {
  await expect(page.locator('#kc-header-wrapper')).toHaveCSS('background-image', /risexpto-auth/);
  await expect(page.locator('.login-pf-page .card-pf')).toBeVisible();
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test.describe('Keycloak registration and recovery layout', () => {
  test('registration keeps the V3 card and safe margins', async ({ page }) => {
    await openKeycloakLogin(page);
    await page.locator('#kc-registration a').click();
    await expect(page.locator('#username, #email')).toBeVisible();
    await expectAuthLayout(page);
  });

  test('forgot password keeps the V3 card and safe margins', async ({ page }) => {
    await openKeycloakLogin(page);
    await page.getByRole('link', { name: /Forgot Password/i }).click();
    await expect(page.locator('#username')).toBeVisible();
    await expectAuthLayout(page);
  });
});
