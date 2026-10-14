import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vite-plus/test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const vp = `${root}node_modules/.bin/vp`;

/**
 * Lints a fixture at a repository-shaped path with the root Oxlint config. `status` is 1 when a
 * Groam plugin rule reports, matching the former `biome lint --only=plugin` fixtures.
 */
export function lintFixture(source: string, file: string) {
  const temporary = mkdtempSync(join(tmpdir(), 'groam-lint-fixture-'));
  const fixture = join(temporary, file);
  mkdirSync(dirname(fixture), { recursive: true });
  writeFileSync(fixture, source);
  let result: ReturnType<typeof spawnSync>;
  try {
    result = spawnSync(vp, ['lint', '-c', `${root}vite.config.ts`, fixture], {
      cwd: root,
      encoding: 'utf8'
    });
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }

  expect(result.error).toBe(undefined);
  // Oxlint exits 0 when clean and 1 for diagnostics; anything else is a crash or config error.
  expect([0, 1]).toContain(result.status);
  const output = String(result.stdout) + String(result.stderr);
  expect(/Failed to (?:load|parse)|Expected .* but found/u.test(output)).toBe(false);
  return { output, status: output.includes('groam(') ? 1 : 0 };
}
