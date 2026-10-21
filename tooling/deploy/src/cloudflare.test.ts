import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vite-plus/test';
import { cloudflareDirectory, prepareCloudflare } from './cloudflare';
import { assertRelease, siteDigest, siteDirectories } from './release';
import { productionTarget } from './target';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

test('publishes both frontends together and detects tampered assembled output', () => {
  const root = mkdtempSync(join(tmpdir(), 'groam-cloudflare-'));
  roots.push(root);
  for (const [name, directory] of Object.entries(siteDirectories)) {
    mkdirSync(join(root, directory), { recursive: true });
    writeFileSync(join(root, directory, 'index.html'), name);
  }
  mkdirSync(join(root, 'tooling/deploy/src'), { recursive: true });
  writeFileSync(join(root, 'tooling/deploy/src/cloudflare-worker.ts'), 'export default {}');
  const target = productionTarget(
    'https://groam.convex.cloud',
    'https://groam.example',
    'a'.repeat(32)
  );
  prepareCloudflare(root, target);
  const output = join(root, cloudflareDirectory);
  expect(readFileSync(join(output, 'assets/index.html'), 'utf8')).toBe('landing');
  expect(readFileSync(join(output, 'assets/app/index.html'), 'utf8')).toBe('web');
  const config = JSON.parse(readFileSync(join(output, 'wrangler.json'), 'utf8'));
  expect(config.assets.not_found_handling).toBe('none');
  expect(config.account_id).toBe(target.cloudflareAccountId);
  const release = {
    sha: 'a'.repeat(40),
    target,
    web: siteDigest(join(root, siteDirectories.web)),
    landing: siteDigest(join(root, siteDirectories.landing)),
    cloudflare: siteDigest(output)
  };
  expect(() => assertRelease(release, target, release.sha, root)).not.toThrow();
  writeFileSync(join(output, 'worker.ts'), 'tampered');
  expect(() => assertRelease(release, target, release.sha, root)).toThrow(/Cloudflare/u);
});
