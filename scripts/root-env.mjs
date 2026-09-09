import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function loadRootEnv(environment = process.env) {
  const path = resolve(root, '.env');
  let contents;
  try {
    contents = readFileSync(path, 'utf8');
  } catch {
    throw new Error(`Missing ${path}. Copy .env.example to .env before starting RiseXPTO.`);
  }
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || environment[match[1]] !== undefined) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    environment[match[1]] = value;
  }
  return environment;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , command, ...args] = process.argv;
  if (!command) throw new Error('Usage: node scripts/root-env.mjs <command> [args...]');
  const { spawn } = await import('node:child_process');
  loadRootEnv();
  const child = spawn(command, args, { env: process.env, stdio: 'inherit', shell: false });
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exitCode = code ?? 1;
  });
}
