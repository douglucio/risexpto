import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadRootEnv } from './root-env.mjs';

const envPath = resolve(process.cwd(), '.env');
const examplePath = resolve(process.cwd(), '.env.example');

loadRootEnv();
if (process.env.NODE_ENV !== 'development') {
  throw new Error('dev:secrets is available only when NODE_ENV=development');
}
if (!existsSync(envPath)) {
  throw new Error('Missing .env. Copy .env.example to .env before generating development secrets.');
}

const original = readFileSync(envPath, 'utf8');
let contents = original;
const replacements = {
  AUTH_SESSION_SECRET: randomBytes(32).toString('base64url'),
  BINANCE_CREDENTIAL_MASTER_KEY: randomBytes(32).toString('base64url'),
};
let generated = 0;
let defaultsAdded = 0;
let obsoleteRemoved = 0;

if (/^BINANCE_BASE_URL=/m.test(contents)) {
  contents = contents.replace(
    /^BINANCE_BASE_URL=.*$/m,
    '# BINANCE_BASE_URL removed; use the explicit TESTNET setting below.',
  );
  obsoleteRemoved = 1;
}

for (const [name, value] of Object.entries(replacements)) {
  const match = contents.match(new RegExp(`^${name}=(.*)$`, 'm'));
  const current = match?.[1]?.trim() ?? '';
  if (current && !current.startsWith('replace-with-')) continue;
  if (match) contents = contents.replace(new RegExp(`^${name}=.*$`, 'm'), `${name}=${value}`);
  else contents += `${contents.endsWith('\n') ? '' : '\n'}${name}=${value}\n`;
  generated += 1;
}

if (existsSync(examplePath)) {
  const existingNames = new Set(
    [...contents.matchAll(/^([A-Za-z_][A-Za-z0-9_]*)=/gm)].map(([_, name]) => name),
  );
  const sensitive = /(?:SECRET|PASSWORD|API_KEY|API_SECRET|MASTER_KEY)/;
  const defaults = readFileSync(examplePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      return match && !existingNames.has(match[1]) && !sensitive.test(match[1]);
    });
  if (defaults.length) {
    contents += `${contents.endsWith('\n') ? '' : '\n'}${defaults.join('\n')}\n`;
    defaultsAdded = defaults.length;
  }
}

if (contents !== original) writeFileSync(envPath, contents);
chmodSync(envPath, 0o600);
console.log(
  generated || defaultsAdded || obsoleteRemoved
    ? `Generated ${generated} development secret(s), added ${defaultsAdded} safe default(s), and migrated ${obsoleteRemoved} obsolete setting(s); existing secrets were preserved.`
    : 'Development secrets and defaults already exist; nothing changed.',
);
