import { spawn } from 'node:child_process';
import { loadRootEnv } from './root-env.mjs';
import { validateDevelopmentEnvironment } from './env-validation.mjs';

loadRootEnv();
validateDevelopmentEnvironment();
const child = spawn('turbo', ['run', 'dev'], { env: process.env, stdio: 'inherit', shell: false });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
