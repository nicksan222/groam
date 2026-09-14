import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveRepoRoot } from './repo-root';

describe('resolveRepoRoot', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('walks up to the package.json that declares workspaces', () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), 'groam-vitest-root-'));
    tempRoots.push(repoRoot);
    writeFileSync(path.join(repoRoot, 'package.json'), JSON.stringify({ workspaces: ['apps/*'] }));

    const nestedPackage = path.join(repoRoot, 'packages', 'ui');
    mkdirSync(nestedPackage, { recursive: true });
    writeFileSync(path.join(nestedPackage, 'package.json'), JSON.stringify({ name: '@groam/ui' }));

    expect(resolveRepoRoot(nestedPackage)).toBe(repoRoot);
  });

  test('throws when no workspace manifest exists', () => {
    const orphan = mkdtempSync(path.join(tmpdir(), 'groam-vitest-orphan-'));
    tempRoots.push(orphan);
    writeFileSync(path.join(orphan, 'package.json'), JSON.stringify({ name: 'orphan' }));

    expect(() => resolveRepoRoot(orphan)).toThrow(/workspace root/u);
  });
});
