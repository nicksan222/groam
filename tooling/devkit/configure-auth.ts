import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { VariableName } from '@groam/env/deployment';
import { localOrigins } from './constants';
import { type ConvexSpawner, runConvex } from './run-convex';

export type ConfigureAuthOptions = {
  envPath?: string;
  randomSecret?: () => string;
  run?: typeof runConvex;
  siteUrl: string;
  spawn?: ConvexSpawner;
  /** Local values for the Void Worker (apps/web/.env), which sends authentication mail. */
  workerEnvPath?: string;
  writeViteSiteUrl?: boolean;
};

const exitIfFailed = (result: { status: number | null; stderr: string }) => {
  if (result.status === 0) return;
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
};

// Convex deployment variables, named as in @groam/env/deployment.
const SITE_URL = 'SITE_URL' satisfies VariableName<'convex'>;
const BETTER_AUTH_SECRET = 'BETTER_AUTH_SECRET' satisfies VariableName<'convex'>;
const AUTH_EMAIL_RELAY_SECRET = 'AUTH_EMAIL_RELAY_SECRET' satisfies VariableName<'convex'>;

const viteSiteUrlLine = /^VITE_SITE_URL=.*$/mu;

export const upsertViteSiteUrl = (envPath: string, siteUrl: string) => {
  const localEnv = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  if (viteSiteUrlLine.test(localEnv)) {
    const nextLocalEnv = localEnv.replace(viteSiteUrlLine, `VITE_SITE_URL=${siteUrl}`);
    if (nextLocalEnv !== localEnv) writeFileSync(envPath, nextLocalEnv);
    return;
  }

  const separator = localEnv.length === 0 || localEnv.endsWith('\n') ? '' : '\n';
  writeFileSync(
    envPath,
    `${localEnv}${separator}\n# Better Auth client origin\nVITE_SITE_URL=${siteUrl}\n`
  );
};

const relaySecretLine = new RegExp(`^${AUTH_EMAIL_RELAY_SECRET}=(.+)$`, 'mu');

/** The relay secret local Worker values already hold, if any. */
const workerRelaySecret = (workerEnvPath: string) =>
  existsSync(workerEnvPath)
    ? relaySecretLine.exec(readFileSync(workerEnvPath, 'utf8'))?.[1]?.trim()
    : undefined;

const appendWorkerRelaySecret = (workerEnvPath: string, secret: string) => {
  const workerEnv = existsSync(workerEnvPath) ? readFileSync(workerEnvPath, 'utf8') : '';
  const separator = workerEnv.length === 0 || workerEnv.endsWith('\n') ? '' : '\n';
  writeFileSync(
    workerEnvPath,
    `${workerEnv}${separator}# Shared with Convex: lets it send authentication mail through the Void Worker\n${AUTH_EMAIL_RELAY_SECRET}=${secret}\n`
  );
};

export const configureAuth = ({
  envPath = '.env.local',
  randomSecret = () => randomBytes(32).toString('base64url'),
  run = runConvex,
  siteUrl,
  spawn,
  workerEnvPath = 'apps/web/.env',
  writeViteSiteUrl = false
}: ConfigureAuthOptions) => {
  const envList = run(['env', 'list', '--names-only'], {}, spawn);
  exitIfFailed(envList);

  const deploymentVariables = new Set(envList.stdout.split(/\r?\n/u).filter(Boolean));

  if (!deploymentVariables.has(BETTER_AUTH_SECRET)) {
    exitIfFailed(
      run(
        ['env', 'set', BETTER_AUTH_SECRET],
        {
          input: `${randomSecret()}\n`,
          stdio: ['pipe', 'inherit', 'inherit']
        },
        spawn
      )
    );
  }

  exitIfFailed(run(['env', 'set', SITE_URL, siteUrl], { stdio: 'inherit' }, spawn));

  // Convex and the local Void Worker share one relay secret; mail lands in Void's dev inbox.
  const existingRelaySecret = workerRelaySecret(workerEnvPath);
  if (!existingRelaySecret || !deploymentVariables.has(AUTH_EMAIL_RELAY_SECRET)) {
    const relaySecret = existingRelaySecret ?? randomSecret();
    exitIfFailed(
      run(
        ['env', 'set', AUTH_EMAIL_RELAY_SECRET],
        { input: `${relaySecret}\n`, stdio: ['pipe', 'inherit', 'inherit'] },
        spawn
      )
    );
    if (!existingRelaySecret) appendWorkerRelaySecret(workerEnvPath, relaySecret);
  }

  if (writeViteSiteUrl) {
    upsertViteSiteUrl(envPath, siteUrl);
  }
};

const parseSiteUrl = (args: string[]) => {
  const flag = args.indexOf('--site-url');
  if (flag !== -1 && args[flag + 1]) return args[flag + 1];
  return localOrigins.vite;
};

if (import.meta.main) {
  const args = process.argv.slice(2);
  configureAuth({
    siteUrl: parseSiteUrl(args),
    writeViteSiteUrl: args.includes('--write-vite-site-url')
  });
}
