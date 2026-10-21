import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { repoRoot } from '@groam/devkit/repo-root';
import type { ReleaseTarget } from '#src/release/target';
import { frontendEnvironment } from '#src/void/environment';
import { frontendApps, withEnvironmentLock } from '#src/void/lock';

/** The web app sends authentication mail, so it never deploys without working email. */
const deployFlags = { web: ['--require-email'], landing: [] } as const;

/** Each `void deploy` builds its app and checks the new version before it takes traffic. */
export function deployFrontends(target: ReleaseTarget): void {
  const voidCli = join(repoRoot, 'apps/web/node_modules/.bin/void');
  for (const app of frontendApps)
    withEnvironmentLock(target, app, () =>
      execFileSync(voidCli, ['deploy', '--platform', 'cloudflare', ...deployFlags[app]], {
        cwd: join(repoRoot, 'apps', app),
        stdio: 'inherit',
        env: frontendEnvironment(target, process.env)
      })
    );
}
