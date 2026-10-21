import { copyFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '@groam/devkit/repo-root';
import type { FrontendApp, ReleaseEnvironment } from '#src/environments';
import { git } from '#src/release/checkout';
import type { ReleaseTarget } from '#src/release/target';

export const frontendApps = ['web', 'landing'] as const satisfies readonly FrontendApp[];

/** Void's record of each Worker, committed per environment under tooling/deploy/locks. */
export const lockPath = (environment: ReleaseEnvironment, app: FrontendApp) =>
  `tooling/deploy/locks/${environment}/${app}.void.lock.json`;

/** Void hardcodes this path, so the release only writes it for the duration of one deploy. */
const appLockPath = (app: FrontendApp) => join(repoRoot, 'apps', app, 'void.lock.json');

/** Reject another environment's resource lock before publishing any application code. */
export function assertVoidLock(source: string, expectedName: string, accountId: string): void {
  const lock: unknown = JSON.parse(source);
  if (!isRecord(lock) || lock.version !== 1 || !isRecord(lock.source) || !isRecord(lock.resolved))
    throw new Error('Invalid Void resource lock.');
  for (const config of [lock.source, lock.resolved]) {
    if (
      config.name !== expectedName ||
      (accountId && config.account_id && config.account_id !== accountId)
    )
      throw new Error('Void resource lock belongs to another Worker or account.');
  }
}

/** The Cloudflare account the committed lock of `app` records, or '' when there is none. */
export function lockedAccountId(environment: ReleaseEnvironment, app: FrontendApp): string {
  const path = join(repoRoot, lockPath(environment, app));
  if (!existsSync(path)) return '';
  const lock: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const accountId = isRecord(lock) && isRecord(lock.resolved) ? lock.resolved.account_id : '';
  return typeof accountId === 'string' ? accountId : '';
}

export function assertCommittedLocks(target: ReleaseTarget): void {
  for (const app of frontendApps) {
    git(['ls-files', '--error-unmatch', lockPath(target.environment, app)]);
    assertVoidLock(
      readFileSync(join(repoRoot, lockPath(target.environment, app)), 'utf8'),
      target.workers[app],
      target.cloudflareAccountId
    );
    if (existsSync(appLockPath(app)))
      throw new Error(`Remove apps/${app}/void.lock.json; releases use tooling/deploy/locks.`);
  }
}

/** Runs `deploy` with this environment's lock in place, rejecting any change Void makes to it. */
export function withEnvironmentLock(
  target: ReleaseTarget,
  app: FrontendApp,
  deploy: () => void
): void {
  const committed = join(repoRoot, lockPath(target.environment, app));
  const transient = appLockPath(app);
  copyFileSync(committed, transient);
  try {
    deploy();
    if (!readFileSync(committed).equals(readFileSync(transient)))
      throw new Error(
        `Void resource state changed. Review and commit ${lockPath(target.environment, app)}.`
      );
  } finally {
    rmSync(transient, { force: true });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
