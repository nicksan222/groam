import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '@groam/devkit/repo-root';
import { env } from '@groam/env/production';
import {
  assertRelease,
  releaseManifestPath,
  siteDirectories,
  type ProductionRelease
} from './release';
import { productionTarget, assertProductionPublisher } from './target';

if (import.meta.main) {
  const target = productionTarget(env.convexUrl, env.siteUrl);
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
  const commands = [
    [
      'convex',
      'deploy',
      '--typecheck-components',
      '--codegen',
      'disable',
      '--message',
      `GitHub main ${sha}`
    ],
    [
      'static-hosting',
      'upload',
      '--prod',
      '--component',
      'web',
      '--dist',
      siteDirectories.web,
      '--spa'
    ],
    [
      'static-hosting',
      'upload',
      '--prod',
      '--component',
      'landing',
      '--dist',
      siteDirectories.landing,
      '--no-spa'
    ]
  ];
  for (const command of commands)
    execFileSync(join(repoRoot, 'node_modules/.bin', command[0] as string), command.slice(1), {
      cwd: repoRoot,
      stdio: 'inherit'
    });
}
