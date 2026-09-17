import { spawn } from 'node:child_process';
import { open, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const devLog = join(repoRoot, 'tooling/showcase/artifacts/ci-dev.log');

async function recentDevOutput() {
  const output = await readFile(devLog, 'utf8').catch(() => '');
  return output.trimEnd().split('\n').slice(-100).join('\n');
}

function run(command: string, args: string[]) {
  const child = spawn(command, args, { cwd: repoRoot, stdio: 'inherit' });
  return new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal ?? 'an unknown status'}`));
    });
  });
}

async function main() {
  await run('sudo', ['bunx', 'playwright', 'install-deps', 'chromium']);
  await run('bun', ['run', 'showcase:setup']);

  const log = await open(devLog, 'w');
  const dev = spawn('bun', ['run', 'dev'], {
    cwd: repoRoot,
    stdio: ['ignore', log.fd, log.fd]
  });

  try {
    await run('bun', ['tooling/devkit/wait-for-dev-stack.ts', '--timeout-ms', '420000']);
    await run('bun', ['run', 'showcase']);
    await run('bun', ['run', 'showcase:gif']);
  } catch (error) {
    console.error('Showcase regeneration failed. Recent dev stack output:');
    console.error(await recentDevOutput());
    throw error;
  } finally {
    if (dev.exitCode === null && dev.signalCode === null) {
      dev.kill();
      await new Promise<void>((resolve) => dev.once('exit', () => resolve()));
    }
    await log.close();
  }
}

await main();
