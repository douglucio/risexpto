import { spawn } from 'node:child_process';
import { loadRootEnv } from './root-env.mjs';

loadRootEnv();

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', args, { env: process.env, stdio: 'inherit', shell: false });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Command failed with exit code ${code ?? 1}`)));
  });
}

await run(['--filter', '@risexpto/database', 'db:deploy']);
await run(['--filter', '@risexpto/database', 'db:seed']);
