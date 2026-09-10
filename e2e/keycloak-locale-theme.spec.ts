import { expect, test } from '@playwright/test';

test.describe('Keycloak locale and RiseXPTO theme', () => {
  for (const [locale, label] of [
    ['en', /Sign in/i],
    ['pt-BR', /Entrar|Iniciar sessão/i],
    ['es', /Iniciar sesión/i],
  ] as const) {
    test(`${locale} is propagated to Keycloak`, async ({ page }) => {
      await page.goto(`/login?locale=${encodeURIComponent(locale)}`);
      await page.getByRole('link', { name: /Sign in|Entrar|Iniciar sesión/ }).click();
      await page.waitForURL(/localhost:8080/);

      await expect(page.locator('#username')).toBeVisible();
      await expect(page.locator('body')).toContainText(label);
      await expect(page.locator('#kc-header-wrapper')).toHaveCSS(
        'background-image',
        /risexpto-auth/,
      );
      const localeButton = page.locator('#kc-current-locale-link');
      const localeMenu = page.locator('#kc-locale [role="menu"]');
      await expect(localeButton).toHaveAttribute('aria-expanded', 'false');
      await expect(localeMenu).toBeHidden();
      await localeButton.click();
      await expect(localeButton).toHaveAttribute('aria-expanded', 'true');
      await expect(localeMenu).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(localeButton).toHaveAttribute('aria-expanded', 'false');
      await expect(localeMenu).toBeHidden();
      await expect(page.locator('body')).toContainText(/RiseXPTO/i);
      const card = page.locator('.login-pf-page .card-pf, .kc-form-card, #kc-form-wrapper').first();
      await expect(card).toBeVisible();
      const metrics = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
      await page.screenshot({ path: `test-results/keycloak-${locale}.png`, fullPage: true });
    });
  }
});
