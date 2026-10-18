import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ProductionTarget } from './target';

export const releaseManifestPath = 'dist/production-release.json';
export const siteDirectories = { web: 'apps/web/dist', landing: 'apps/landing/dist' } as const;

/** Bind both builds to one tested commit and detect changed or incomplete output. */
export function siteDigest(directory: string): string {
  const hash = createHash('sha256');
  const visit = (folder: string, relative = '') => {
    for (const entry of readdirSync(folder, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const name = `${relative}${entry.name}`;
      const path = join(folder, entry.name);
      if (entry.isSymbolicLink())
        throw new Error('Production build output must not contain symbolic links.');
      if (entry.isDirectory()) visit(path, `${name}/`);
      else {
        hash.update(name);
        hash.update('\0');
        hash.update(readFileSync(path));
        hash.update('\0');
      }
    }
  };
  visit(directory);
  return hash.digest('hex');
}

export type ProductionRelease = {
  sha: string;
  target: ProductionTarget;
  web: string;
  landing: string;
};

export function assertRelease(
  release: ProductionRelease,
  target: ProductionTarget,
  sha: string,
  root: string
): void {
  if (release.sha !== sha || JSON.stringify(release.target) !== JSON.stringify(target))
    throw new Error(
      'The production build does not match this tested commit and destination. Build it again.'
    );
  for (const site of ['web', 'landing'] as const) {
    if (siteDigest(join(root, siteDirectories[site])) !== release[site])
      throw new Error(`The ${site} build changed after verification. Build it again.`);
  }
}
