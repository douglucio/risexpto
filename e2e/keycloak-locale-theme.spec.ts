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
      await expect(page.locator('#kc-header-wrapper, header, body').first()).toContainText(
        /RiseXPTO/i,
      );
      await page.screenshot({ path: `test-results/keycloak-${locale}.png`, fullPage: true });
    });
  }
});
