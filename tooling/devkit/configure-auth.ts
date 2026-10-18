import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { localOrigins } from './constants';
import { type ConvexSpawner, runConvex } from './run-convex';

export type ConfigureAuthOptions = {
  envPath?: string;
  randomSecret?: () => string;
  run?: typeof runConvex;
  siteUrl: string;
  spawn?: ConvexSpawner;
  writeViteSiteUrl?: boolean;
};

const exitIfFailed = (result: { status: number | null; stderr: string }) => {
  if (result.status === 0) return;
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
};

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

export const configureAuth = ({
  envPath = '.env.local',
  randomSecret = () => randomBytes(32).toString('base64url'),
  run = runConvex,
  siteUrl,
  spawn,
  writeViteSiteUrl = false
}: ConfigureAuthOptions) => {
  const envList = run(['env', 'list', '--names-only'], {}, spawn);
  exitIfFailed(envList);

  const deploymentVariables = new Set(envList.stdout.split(/\r?\n/u).filter(Boolean));

  if (!deploymentVariables.has('BETTER_AUTH_SECRET')) {
    exitIfFailed(
      run(
        ['env', 'set', 'BETTER_AUTH_SECRET'],
        {
          input: `${randomSecret()}\n`,
          stdio: ['pipe', 'inherit', 'inherit']
        },
        spawn
      )
    );
  }

  exitIfFailed(run(['env', 'set', 'SITE_URL', siteUrl], { stdio: 'inherit' }, spawn));

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
