import { expect, test } from '@playwright/test';

const viewports = [
  ['desktop-wide', { width: 1440, height: 900 }],
  ['desktop-normal', { width: 1366, height: 768 }],
  ['tablet', { width: 834, height: 1112 }],
  ['mobile', { width: 390, height: 844 }],
] as const;

for (const [name, viewport] of viewports) {
  test(`Keycloak login has safe layout at ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/login?locale=en');
    await page.getByRole('link', { name: /Sign in|Entrar|Iniciar sesión/ }).click();
    await page.waitForURL(/localhost:8080/);
    await expect(page.locator('#kc-header-wrapper')).toBeVisible();
    await expect(page.locator('#kc-current-locale-link')).toHaveAttribute('aria-expanded', 'false');
    const metrics = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      logoWidth: document.querySelector<HTMLElement>('#kc-header-wrapper')?.getBoundingClientRect().width ?? 0,
      cardWidth: document.querySelector<HTMLElement>('.card-pf')?.getBoundingClientRect().width ?? 0,
    }));
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.logoWidth).toBeGreaterThan(0);
    expect(metrics.cardWidth).toBeLessThanOrEqual(metrics.viewportWidth - 32);
  });
}
