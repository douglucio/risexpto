import { readFile } from 'node:fs/promises';
import { loadRootEnv } from './root-env.mjs';

loadRootEnv();

const mode = process.argv[2];
if (mode !== 'check' && mode !== 'reconcile') {
  throw new Error('Usage: node scripts/keycloak-realm.mjs <check|reconcile>');
}
if (process.env.NODE_ENV !== 'development') {
  throw new Error('Keycloak realm commands are development-only');
}

const versioned = JSON.parse(
  await readFile(new URL('../infra/keycloak/risexpto-realm.json', import.meta.url)),
);
const base = required(process.env.KEYCLOAK_URL, 'KEYCLOAK_URL').replace(/\/$/, '');
const realm = required(process.env.KEYCLOAK_REALM, 'KEYCLOAK_REALM');
const adminUser = required(process.env.KEYCLOAK_ADMIN, 'KEYCLOAK_ADMIN');
const adminPassword = required(process.env.KEYCLOAK_ADMIN_PASSWORD, 'KEYCLOAK_ADMIN_PASSWORD');
const adminBase = `${base}/admin/realms/${encodeURIComponent(realm)}`;

const tokenResponse = await fetch(`${base}/realms/master/protocol/openid-connect/token`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: adminUser,
    password: adminPassword,
  }),
  signal: AbortSignal.timeout(10_000),
});
if (!tokenResponse.ok)
  throw new Error(`Keycloak admin authentication failed (${tokenResponse.status})`);
const { access_token: accessToken } = await tokenResponse.json();
const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
const effectiveRealm = await get(`${adminBase}`);
const clients = await get(`${adminBase}/clients?clientId=risexpto-web`);
const client = clients[0];
if (!client) throw new Error('Effective realm is missing client risexpto-web');
const scopes = await get(`${adminBase}/client-scopes`);
const roles = await get(`${adminBase}/roles`);
const effective = await summarize(effectiveRealm, client, scopes, roles);
const expected = expectedSummary(versioned);
const mismatches = compare(expected, effective);

if (mode === 'check') {
  console.log(JSON.stringify({ realm, mode, expected, effective, mismatches }, null, 2));
  if (mismatches.length) process.exitCode = 1;
} else {
  await reconcile(effectiveRealm, client, scopes, versioned);
  const after = await get(`${adminBase}`);
  const afterClients = await get(`${adminBase}/clients?clientId=risexpto-web`);
  const afterScopes = await get(`${adminBase}/client-scopes`);
  const afterRoles = await get(`${adminBase}/roles`);
  const reconciled = await summarize(after, afterClients[0], afterScopes, afterRoles);
  const remaining = compare(expected, reconciled);
  console.log(
    JSON.stringify({ realm, mode, effective: reconciled, mismatches: remaining }, null, 2),
  );
  if (remaining.length) process.exitCode = 1;
}

async function reconcile(currentRealm, currentClient, currentScopes, expectedRealm) {
  const realmPatch = {
    enabled: expectedRealm.enabled,
    loginTheme: expectedRealm.loginTheme,
    internationalizationEnabled: expectedRealm.internationalizationEnabled,
    supportedLocales: expectedRealm.supportedLocales,
    defaultLocale: expectedRealm.defaultLocale,
    verifyEmail: expectedRealm.verifyEmail,
    registrationAllowed: expectedRealm.registrationAllowed,
    registrationEmailAsUsername: expectedRealm.registrationEmailAsUsername,
    resetPasswordAllowed: expectedRealm.resetPasswordAllowed,
    loginWithEmailAllowed: expectedRealm.loginWithEmailAllowed,
    duplicateEmailsAllowed: expectedRealm.duplicateEmailsAllowed,
    bruteForceProtected: expectedRealm.bruteForceProtected,
    failureFactor: expectedRealm.failureFactor,
    waitIncrementSeconds: expectedRealm.waitIncrementSeconds,
    maxFailureWaitSeconds: expectedRealm.maxFailureWaitSeconds,
  };
  await put(`${adminBase}`, { ...currentRealm, ...realmPatch });
  for (const expectedRole of expectedRealm.roles?.realm ?? []) {
    const existing = await get(`${adminBase}/roles/${encodeURIComponent(expectedRole.name)}`).catch(
      () => null,
    );
    if (!existing) await post(`${adminBase}/roles`, expectedRole);
  }
  const scopeByName = new Map(currentScopes.map((scope) => [scope.name, scope]));
  for (const expectedScope of expectedRealm.clientScopes ?? []) {
    let scope = scopeByName.get(expectedScope.name);
    if (!scope) {
      await post(`${adminBase}/client-scopes`, {
        name: expectedScope.name,
        protocol: expectedScope.protocol,
        attributes: expectedScope.attributes,
      });
      scope = (
        await get(`${adminBase}/client-scopes?search=${encodeURIComponent(expectedScope.name)}`)
      ).find((item) => item.name === expectedScope.name);
    }
    if (!scope) continue;
    for (const mapper of expectedScope.protocolMappers ?? []) {
      const mappers = await get(`${adminBase}/client-scopes/${scope.id}/protocol-mappers/models`);
      if (!mappers.some((item) => item.name === mapper.name))
        await post(`${adminBase}/client-scopes/${scope.id}/protocol-mappers/models`, mapper);
    }
  }
  const freshClient = (await get(`${adminBase}/clients?clientId=risexpto-web`))[0];
  if (freshClient) {
    await put(`${adminBase}/clients/${freshClient.id}`, {
      ...freshClient,
      redirectUris: expectedRealm.clients.find((item) => item.clientId === 'risexpto-web')
        ?.redirectUris,
      webOrigins: expectedRealm.clients.find((item) => item.clientId === 'risexpto-web')
        ?.webOrigins,
      attributes: {
        ...freshClient.attributes,
        ...expectedRealm.clients.find((item) => item.clientId === 'risexpto-web')?.attributes,
      },
    });
    const defaults = await get(`${adminBase}/clients/${freshClient.id}/default-client-scopes`);
    const defaultNames = new Set(defaults.map((item) => item.name));
    for (const scopeName of expectedRealm.clients.find((item) => item.clientId === 'risexpto-web')
      ?.defaultClientScopes ?? []) {
      const scope = (
        await get(`${adminBase}/client-scopes?search=${encodeURIComponent(scopeName)}`)
      ).find((item) => item.name === scopeName);
      if (scope && !defaultNames.has(scopeName))
        await put(`${adminBase}/clients/${freshClient.id}/default-client-scopes/${scope.id}`);
    }
  }
}

async function summarize(currentRealm, client, scopes, roles) {
  const defaults = await get(`${adminBase}/clients/${client.id}/default-client-scopes`);
  const names = new Set(defaults.map((item) => item.name));
  const expectedScopeNames = ['openid', 'roles', 'profile', 'email', 'risexpto-api-audience'];
  const mapperSummary = {};
  for (const scopeName of expectedScopeNames) {
    const scope = scopes.find((item) => item.name === scopeName);
    mapperSummary[scopeName] = scope
      ? (await get(`${adminBase}/client-scopes/${scope.id}/protocol-mappers/models`)).map(
          (item) => item.name,
        )
      : [];
  }
  return {
    verifyEmail: currentRealm.verifyEmail,
    loginTheme: currentRealm.loginTheme,
    internationalizationEnabled: currentRealm.internationalizationEnabled,
    supportedLocales: [...(currentRealm.supportedLocales ?? [])].sort(),
    defaultLocale: currentRealm.defaultLocale,
    client: client.clientId,
    defaultScopes: expectedScopeNames.filter((name) => names.has(name)).sort(),
    emailMapper: mapperSummary.email?.includes('email') ?? false,
    emailVerifiedMapper: mapperSummary.email?.includes('email verified') ?? false,
    subjectMapper: mapperSummary.openid?.includes('subject') ?? false,
    audienceMapper:
      mapperSummary['risexpto-api-audience']?.includes('RiseXPTO API audience') ?? false,
    realmRoles: roles
      .filter((role) => ['USER', 'SUPPORT', 'ADMIN'].includes(role.name))
      .map((role) => role.name)
      .sort(),
    redirectUris: client.redirectUris ?? [],
    webOrigins: client.webOrigins ?? [],
  };
}

function expectedSummary(value) {
  const web = value.clients.find((client) => client.clientId === 'risexpto-web');
  return {
    verifyEmail: value.verifyEmail,
    loginTheme: value.loginTheme,
    internationalizationEnabled: value.internationalizationEnabled,
    supportedLocales: [...(value.supportedLocales ?? [])].sort(),
    defaultLocale: value.defaultLocale,
    client: web?.clientId,
    defaultScopes: [...(web?.defaultClientScopes ?? [])].sort(),
    emailMapper: true,
    emailVerifiedMapper: true,
    subjectMapper: true,
    audienceMapper: true,
    realmRoles: (value.roles?.realm ?? []).map((role) => role.name).sort(),
    redirectUris: web?.redirectUris ?? [],
    webOrigins: web?.webOrigins ?? [],
  };
}
function compare(expected, actual) {
  return Object.keys(expected).filter(
    (key) => JSON.stringify(expected[key]) !== JSON.stringify(actual[key]),
  );
}
async function get(url) {
  return request(url);
}
async function post(url, body) {
  return request(url, { method: 'POST', body: JSON.stringify(body) });
}
async function put(url, body) {
  return request(url, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Keycloak admin request failed (${response.status})`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
function required(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}
