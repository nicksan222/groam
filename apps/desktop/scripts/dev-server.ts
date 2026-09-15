import { existsSync } from 'node:fs';
import path from 'node:path';
import { configureAuth } from '@groam/devkit/configure-auth';
import { localOrigins } from '@groam/devkit/constants';
import { isHttpOk, waitForHttp } from '@groam/devkit/http-readiness';
import { repoRoot } from '@groam/devkit/repo-root';
import { runConvex } from '@groam/devkit/run-convex';
import { syncOptionalAiEnvironment } from '@groam/devkit/sync-ai-env';
import { isConvexBackendResponding, waitForBackend } from '@groam/devkit/wait-for-backend';
import { env as desktopToolingEnv } from '@groam/env/desktop-tooling';

Bun.env.CONVEX_AGENT_MODE = desktopToolingEnv.convexAgentMode;

const spawnLogged = (command: string[], cwd: string, extraEnv: NodeJS.ProcessEnv = {}) =>
  Bun.spawn(command, {
    cwd,
    env: {
      ...Bun.env,
      CONVEX_AGENT_MODE: desktopToolingEnv.convexAgentMode,
      ...extraEnv
    },
    stderr: 'inherit',
    stdout: 'inherit'
  });

const backendReady = await isConvexBackendResponding(localOrigins.convexApi);
if (!(backendReady || existsSync(path.join(repoRoot, '.env.local')))) {
  const init = runConvex(['init'], { stdio: 'inherit' });
  if (init.status !== 0) process.exit(init.status ?? 1);
}

const convex = backendReady
  ? undefined
  : spawnLogged(
      ['bunx', 'convex', 'dev', '--typecheck-components', '--tail-logs', 'disable'],
      repoRoot
    );
if (!backendReady) console.info('[groam] Starting Convex backend');
await waitForBackend(localOrigins.convexApi);
configureAuth({ siteUrl: localOrigins.vite, writeViteSiteUrl: true });
syncOptionalAiEnvironment();

const viteReady = await isHttpOk(`${localOrigins.viteLoopback}/`);
const vite = viteReady
  ? undefined
  : spawnLogged(['bun', 'run', 'dev'], path.join(repoRoot, 'apps/web'), {
      VITE_GROAM_SHELL: 'desktop'
    });
if (!viteReady) {
  console.info('[groam] Starting Vite with the desktop shell');
  await waitForHttp(`${localOrigins.viteLoopback}/`);
}

const stopOwned = () => {
  vite?.kill('SIGTERM');
  convex?.kill('SIGTERM');
};
process.on('SIGINT', stopOwned);
process.on('SIGTERM', stopOwned);

if (vite) process.exit(await vite.exited);
await new Promise<void>(() => undefined);
