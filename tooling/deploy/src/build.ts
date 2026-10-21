import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { repoRoot } from '@groam/devkit/repo-root';
import { env } from '@groam/env/production';
import { prepareCloudflare, cloudflareDirectory } from './cloudflare';
import {
  releaseManifestPath,
  siteDigest,
  siteDirectories,
  type ProductionRelease
} from './release';
import { productionTarget, buildEnvironment } from './target';

if (import.meta.main) {
  const target = productionTarget(
    env.convexUrl,
    env.siteUrl,
    env.cloudflareAccountId,
    env.cloudflareWorkerName
  );
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8'
  }).trim();
  if (env.sha && env.sha !== sha)
    throw new Error('Build checkout does not match the tested commit.');
  const childEnv = buildEnvironment(target, process.env);
  for (const command of ['build:web', 'build:landing'])
    execFileSync('bun', ['--no-env-file', 'run', command], {
      cwd: repoRoot,
      env: childEnv,
      stdio: 'inherit'
    });
  prepareCloudflare(repoRoot, target);
  const release: ProductionRelease = {
    sha,
    target,
    cloudflare: siteDigest(join(repoRoot, cloudflareDirectory)),
    web: siteDigest(join(repoRoot, siteDirectories.web)),
    landing: siteDigest(join(repoRoot, siteDirectories.landing))
  };
  const path = join(repoRoot, releaseManifestPath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(release, null, 2)}\n`);
}
