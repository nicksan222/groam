import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vite-plus/test';
import { assertRelease, siteDigest, siteDirectories } from './release';
import { productionTarget } from './target';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));
const target = productionTarget(
  'https://groam-demo.convex.cloud',
  'https://groam-demo.convex.site'
);

test('rejects mixed commits, destinations, and changed build output before publishing', () => {
  const root = mkdtempSync(join(tmpdir(), 'groam-release-'));
  roots.push(root);
  for (const directory of Object.values(siteDirectories)) {
    mkdirSync(join(root, directory), { recursive: true });
    writeFileSync(join(root, directory, 'index.html'), 'build');
  }
  const release = {
    sha: 'a'.repeat(40),
    target,
    web: siteDigest(join(root, siteDirectories.web)),
    landing: siteDigest(join(root, siteDirectories.landing))
  };
  expect(() => assertRelease(release, target, release.sha, root)).not.toThrow();
  expect(() => assertRelease(release, target, 'b'.repeat(40), root)).toThrow();
  expect(() =>
    assertRelease(release, { ...target, siteUrl: 'https://other.convex.site' }, release.sha, root)
  ).toThrow();
  writeFileSync(join(root, siteDirectories.web, 'index.html'), 'changed');
  expect(() => assertRelease(release, target, release.sha, root)).toThrow();
});

test('does not follow build output symlinks into private files', () => {
  const root = mkdtempSync(join(tmpdir(), 'groam-release-'));
  roots.push(root);
  writeFileSync(join(root, 'private'), 'not an asset');
  mkdirSync(join(root, 'build'));
  symlinkSync(join(root, 'private'), join(root, 'build', 'linked'));
  expect(() => siteDigest(join(root, 'build'))).toThrow(/symbolic/u);
});
