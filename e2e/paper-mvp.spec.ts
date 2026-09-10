import { expect, test } from '@playwright/test';

const username = process.env.E2E_AUTH_USERNAME;
const password = process.env.E2E_AUTH_PASSWORD;

test.skip(
  !username || !password,
  'Set E2E_AUTH_USERNAME and E2E_AUTH_PASSWORD for a local verified Keycloak user',
);

test('creates and starts a PAPER DCA bot from the workspace', async ({ page }) => {
  await page.goto('/login?locale=en');
  await page.getByRole('link', { name: /Sign in|Entrar|Iniciar sesión/ }).click();
  await page.waitForURL(/localhost:8080/);
  await page.locator('#username').fill(username!);
  await page.locator('#password').fill(password!);
  await page.locator('input[type="submit"], button[type="submit"]').first().click();
  await page.waitForURL(/\/dashboard$/);

  await page.goto('/bots');
  await page.getByRole('button', { name: /Create bot|Criar bot|Crear bot/ }).click();
  await page.getByLabel(/Strategy|Estratégia|Estrategia/).selectOption({ label: 'DCA' });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByLabel(/Bot name|Nome do bot|Nombre del bot/).fill('Manual PAPER DCA');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: /Create PAPER|Criar PAPER|Crear PAPER/ }).click();

  await expect(page.getByText('Manual PAPER DCA')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Start|Iniciar|Iniciar bot/ }).click();
  const cycleButton = page.getByRole('button', {
    name: /Run cycle|Executar ciclo|Ejecutar ciclo/,
  });
  await expect(cycleButton).toBeVisible();
  await cycleButton.click();
  await expect(
    page.getByText(/Paper cycle queued|Ciclo Paper enfileirado|Ciclo Paper en cola/),
  ).toBeVisible();

  const bots = await page.request.get('/api/bots');
  expect(bots.status()).toBe(200);
  await expect(bots.json()).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Manual PAPER DCA',
        tradingMode: 'PAPER',
        status: 'RUNNING',
      }),
    ]),
  );
});
