import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { configureAuth } from '@groam/devkit/configure-auth';
import { waitForHttp } from '@groam/devkit/http-readiness';
import { syncOptionalAiEnvironment } from '@groam/devkit/sync-ai-env';
import { linkDataDirectory } from './data-dir';
import { runtimeEnv } from './env';
import { isBackendResponding, waitForBackend } from './wait-for-backend';

Bun.env.CONVEX_AGENT_MODE = runtimeEnv.convexAgentMode;

const runStep = (label: string, command: string[]) => {
  console.info(`[groam] ${label}`);
  const result = spawnSync(command[0], command.slice(1), {
    cwd: runtimeEnv.projectRoot,
    stdio: 'inherit'
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

if (runtimeEnv.dataDirIsExplicit) {
  linkDataDirectory();
}

const backendAlreadyRunning = await isBackendResponding(runtimeEnv.convexUrl);
if (!(backendAlreadyRunning || existsSync(path.join(runtimeEnv.projectRoot, '.env.local')))) {
  runStep('Initializing Convex project', ['bunx', 'convex', 'init']);
}

const convexDev = backendAlreadyRunning
  ? undefined
  : Bun.spawn(['bunx', 'convex', 'dev', '--typecheck-components', '--tail-logs', 'disable'], {
      cwd: runtimeEnv.projectRoot,
      env: { ...Bun.env, CONVEX_AGENT_MODE: runtimeEnv.convexAgentMode },
      stderr: 'inherit',
      stdout: 'inherit'
    });

const shutdown = (signal: NodeJS.Signals) => {
  convexDev?.kill(signal);
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

await waitForBackend();
configureAuth({ siteUrl: runtimeEnv.siteUrl, writeViteSiteUrl: false });
syncOptionalAiEnvironment();
runStep('Running pending migrations', ['bun', 'run', 'migrations:run']);
runStep('Publishing static sites', ['bun', 'run', 'hosting:upload:web:desktop']);
await waitForHttp(`${runtimeEnv.siteOrigin}/`);

console.info(`[groam] Groam is ready at ${runtimeEnv.siteOrigin}/`);
if (convexDev) process.exit(await convexDev.exited);
await new Promise<void>(() => undefined);
