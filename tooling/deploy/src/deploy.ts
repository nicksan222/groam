import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '@groam/devkit/repo-root';
import { env } from '@groam/env/production';
import { assertProductionAuthEnvironment, assertProductionAuthOrigin } from './preflight';
import { assertRelease, releaseManifestPath, type ProductionRelease } from './release';
import { productionTarget, assertProductionPublisher } from './target';

if (import.meta.main) {
  const target = productionTarget(
    env.convexUrl,
    env.siteUrl,
    env.cloudflareAccountId,
    env.cloudflareWorkerName
  );
  assertProductionPublisher(target, env);
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8'
  }).trim();
  if (sha !== env.sha) throw new Error('Deploy checkout does not match the tested commit.');
  // A build must not silently rewrite source after CI tested it.
  execFileSync('git', ['diff', '--exit-code', 'HEAD', '--', '.'], {
    cwd: repoRoot,
    stdio: 'inherit'
  });
  const release = JSON.parse(
    readFileSync(join(repoRoot, releaseManifestPath), 'utf8')
  ) as ProductionRelease;
  assertRelease(release, target, sha, repoRoot);
  const convexEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('CLOUDFLARE_'))
  );
  assertProductionAuthEnvironment(
    execFileSync(
      join(repoRoot, 'node_modules/.bin/convex'),
      ['env', 'list', '--prod', '--names-only'],
      {
        cwd: repoRoot,
        env: convexEnvironment,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit']
      }
    )
  );
  assertProductionAuthOrigin(
    execFileSync(join(repoRoot, 'node_modules/.bin/convex'), ['env', 'get', 'SITE_URL', '--prod'], {
      cwd: repoRoot,
      env: convexEnvironment,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit']
    }),
    target.siteUrl
  );
  execFileSync(
    join(repoRoot, 'node_modules/.bin/convex'),
    ['deploy', '--typecheck-components', '--codegen', 'disable', '--message', `GitHub main ${sha}`],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: convexEnvironment
    }
  );
  execFileSync(
    join(repoRoot, 'tooling/deploy/node_modules/.bin/wrangler'),
    ['deploy', '--config', join(repoRoot, 'dist/cloudflare/wrangler.json'), '--keep-vars'],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !key.startsWith('CONVEX_'))
      )
    }
  );
}
