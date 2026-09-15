import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pruneDanglingSymlinks, stageRuntimeResources } from './stage-resources';

const writeFile = (filePath: string, contents = '') => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
};

describe('pruneDanglingSymlinks', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('removes dangling links and keeps resolvable ones', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'groam-prune-'));
    tempRoots.push(root);
    const target = path.join(root, 'present.txt');
    writeFile(target, 'ok');
    symlinkSync(target, path.join(root, 'good-link'));
    symlinkSync(path.join(root, 'missing.txt'), path.join(root, 'bad-link'));

    pruneDanglingSymlinks(root);

    expect(existsSync(path.join(root, 'good-link'))).toBe(true);
    expect(existsSync(path.join(root, 'bad-link'))).toBe(false);
  });
});

describe('stageRuntimeResources', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('skips nested package node_modules and dangling workspace links', () => {
    const projectRoot = mkdtempSync(path.join(tmpdir(), 'groam-stage-'));
    const stageRoot = path.join(projectRoot, 'apps/desktop/src-tauri/groam-runtime');
    tempRoots.push(projectRoot);

    writeFile(path.join(projectRoot, 'package.json'), '{}');
    writeFile(path.join(projectRoot, 'bun.lock'), '');
    writeFile(path.join(projectRoot, 'convex.json'), '{}');
    writeFile(path.join(projectRoot, 'apps/desktop/runtime/start.ts'), '');
    writeFile(path.join(projectRoot, 'tooling/devkit/configure-auth.ts'), '');
    writeFile(path.join(projectRoot, 'packages/ui/package.json'), '{}');
    writeFile(path.join(projectRoot, 'apps/web/dist/index.html'), '<html></html>');
    writeFile(path.join(projectRoot, 'node_modules/.keep'), '');

    mkdirSync(path.join(projectRoot, 'packages/ui/node_modules/@groam'), { recursive: true });
    mkdirSync(path.join(projectRoot, 'node_modules/@groam'), { recursive: true });
    symlinkSync(
      path.join(projectRoot, 'tooling/missing-postcss'),
      path.join(projectRoot, 'packages/ui/node_modules/@groam/postcss-config')
    );
    symlinkSync(
      path.join(projectRoot, 'tooling/missing-postcss'),
      path.join(projectRoot, 'node_modules/@groam/postcss-config')
    );

    stageRuntimeResources(projectRoot, stageRoot);

    expect(existsSync(path.join(stageRoot, 'packages/ui/package.json'))).toBe(true);
    expect(existsSync(path.join(stageRoot, 'runtime/start.ts'))).toBe(true);
    expect(existsSync(path.join(stageRoot, 'tooling/devkit/configure-auth.ts'))).toBe(true);
    expect(existsSync(path.join(stageRoot, '.groam-runtime-build'))).toBe(true);
    expect(existsSync(path.join(stageRoot, 'packages/ui/node_modules'))).toBe(false);
    expect(existsSync(path.join(stageRoot, 'node_modules/@groam/postcss-config'))).toBe(false);
  });

  test('excludes musl native packages from a GNU Linux runtime', () => {
    const projectRoot = mkdtempSync(path.join(tmpdir(), 'groam-stage-'));
    const stageRoot = path.join(projectRoot, 'apps/desktop/src-tauri/groam-runtime');
    tempRoots.push(projectRoot);

    writeFile(path.join(projectRoot, 'package.json'), '{}');
    writeFile(path.join(projectRoot, 'bun.lock'), '');
    writeFile(path.join(projectRoot, 'convex.json'), '{}');
    writeFile(path.join(projectRoot, 'apps/desktop/runtime/start.ts'), '');
    writeFile(path.join(projectRoot, 'tooling/devkit/configure-auth.ts'), '');
    writeFile(path.join(projectRoot, 'packages/ui/package.json'), '{}');
    writeFile(path.join(projectRoot, 'apps/web/dist/index.html'), '<html></html>');
    writeFile(path.join(projectRoot, 'node_modules/native-linux-x64-gnu/binding.node'), 'gnu');
    writeFile(path.join(projectRoot, 'node_modules/native-linux-x64-musl/binding.node'), 'musl');

    stageRuntimeResources(projectRoot, stageRoot, 'x86_64-unknown-linux-gnu');

    expect(existsSync(path.join(stageRoot, 'node_modules/native-linux-x64-gnu/binding.node'))).toBe(
      true
    );
    expect(
      existsSync(path.join(stageRoot, 'node_modules/native-linux-x64-musl/binding.node'))
    ).toBe(false);
  });
});
