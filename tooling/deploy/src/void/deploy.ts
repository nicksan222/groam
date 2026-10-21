import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { repoRoot } from '@groam/devkit/repo-root';
import type { ReleaseTarget } from '#src/release/target';
import { frontendEnvironment } from '#src/void/environment';
import { frontendApps, withEnvironmentLock } from '#src/void/lock';

/** Each `void deploy` builds its app and checks the new version before it takes traffic. */
export function deployFrontends(target: ReleaseTarget): void {
  const voidCli = join(repoRoot, 'apps/web/node_modules/.bin/void');
  for (const app of frontendApps)
    withEnvironmentLock(target, app, () =>
      execFileSync(voidCli, ['deploy', '--platform', 'cloudflare'], {
        cwd: join(repoRoot, 'apps', app),
        stdio: 'inherit',
        env: frontendEnvironment(target, process.env)
      })
    );
}
