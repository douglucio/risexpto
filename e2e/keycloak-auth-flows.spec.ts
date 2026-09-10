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

  test('locale menu selects Spanish and closes through native Keycloak navigation', async ({ page }) => {
    await openKeycloakLogin(page);
    const localeButton = page.locator('#kc-current-locale-link');
    await expect(localeButton).toHaveAttribute('aria-expanded', 'false');
    await localeButton.click();
    await expect(page.locator('#kc-locale [role="menu"]')).toBeVisible();
    await page.getByRole('menuitem', { name: /Spanish/i }).click();
    await expect(page).toHaveURL(/kc_locale=es/);
    await expect(page.locator('#kc-current-locale-link')).toContainText(/Español|Spanish/i);
    await expect(page.locator('#kc-locale [role="menu"]')).toBeHidden();
  });

  test('invalid credentials keep the card and inputs dark with a scoped error', async ({ page }) => {
    await openKeycloakLogin(page);
    await page.locator('#username').fill('invalid@example.com');
    await page.locator('#password').fill('invalid-password');
    await page.locator('#kc-login').click();
    await expect(page.locator('#kc-error-message, .alert-error, .kc-feedback-text').first()).toBeVisible();
    const colors = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>('.card-pf');
      const input = document.querySelector<HTMLElement>('#password');
      return { card: card ? getComputedStyle(card).backgroundColor : '', input: input ? getComputedStyle(input).backgroundColor : '' };
    });
    expect(colors.card).not.toMatch(/255, 102, 125/);
    expect(colors.input).not.toMatch(/255, 102, 125/);
  });
});
