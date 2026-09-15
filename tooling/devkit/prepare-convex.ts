import { fileURLToPath } from 'node:url';
import { configureAuth } from '@groam/devkit/configure-auth';
import { localOrigins } from '@groam/devkit/constants';
import { runConvex } from '@groam/devkit/run-convex';
import { syncOptionalAiEnvironment } from '@groam/devkit/sync-ai-env';
import {
  isConvexBackendResponding,
  resolveWaitTimeoutMs,
  waitForBackend
} from '@groam/devkit/wait-for-backend';
import { env } from '@groam/env/convex-tooling';
import { stopLocalBackend } from './local-backend';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const backendUrl = env.convexUrl || localOrigins.convexApi;

if (!(await isConvexBackendResponding(backendUrl))) {
  const init = runConvex(['init'], { stdio: 'inherit' });
  if (init.status !== 0) process.exit(init.status ?? 1);
} else {
  console.info('Convex local backend already running; preparing it for the dev watcher.');
}

try {
  await waitForBackend(backendUrl, { timeoutMs: resolveWaitTimeoutMs() });
} catch (error) {
  console.info(error instanceof Error ? error.message : error);
  console.info('Skipping auth and AI env until Convex is running.');
  process.exit(0);
}

configureAuth({
  siteUrl: localOrigins.vite,
  writeViteSiteUrl: true
});
syncOptionalAiEnvironment();

if (await isConvexBackendResponding(backendUrl)) {
  console.info('Restarting the local backend under the Convex dev watcher.');
  if (!(await stopLocalBackend(backendUrl, projectRoot))) {
    console.error('Unable to stop the existing Convex local backend.');
    process.exit(1);
  }
}
