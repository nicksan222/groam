import { afterEach, describe, expect, test } from 'bun:test';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { linkDataDirectory } from './data-dir';

describe('linkDataDirectory', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('creates a symlink from the project .convex folder to persistent data', () => {
    const projectRoot = mkdtempSync(path.join(tmpdir(), 'groam-runtime-'));
    const dataDir = path.join(projectRoot, 'data');
    tempRoots.push(projectRoot);

    const previousCwd = process.cwd();
    process.chdir(projectRoot);
    try {
      linkDataDirectory(dataDir);

      const convexLinkPath = path.join(projectRoot, '.convex');
      const dataConvexPath = path.join(dataDir, '.convex');
      expect(existsSync(convexLinkPath)).toBe(true);
      expect(lstatSync(convexLinkPath).isSymbolicLink()).toBe(true);
      expect(existsSync(dataConvexPath)).toBe(true);
      expect(path.resolve(path.dirname(convexLinkPath), readlinkSync(convexLinkPath))).toBe(
        path.resolve(dataConvexPath)
      );
    } finally {
      process.chdir(previousCwd);
    }
  });

  test('leaves an existing symlink in place when it already points at the data dir', () => {
    const projectRoot = mkdtempSync(path.join(tmpdir(), 'groam-runtime-'));
    const dataDir = path.join(projectRoot, 'data');
    tempRoots.push(projectRoot);

    const previousCwd = process.cwd();
    process.chdir(projectRoot);
    try {
      linkDataDirectory(dataDir);
      linkDataDirectory(dataDir);

      const convexLinkPath = path.join(projectRoot, '.convex');
      expect(lstatSync(convexLinkPath).isSymbolicLink()).toBe(true);
      expect(path.resolve(path.dirname(convexLinkPath), readlinkSync(convexLinkPath))).toBe(
        path.resolve(path.join(dataDir, '.convex'))
      );
    } finally {
      process.chdir(previousCwd);
    }
  });

  test('retargets a symlink that points at a different data directory', () => {
    const projectRoot = mkdtempSync(path.join(tmpdir(), 'groam-runtime-'));
    const staleDir = path.join(projectRoot, 'stale');
    const dataDir = path.join(projectRoot, 'data');
    tempRoots.push(projectRoot);

    const previousCwd = process.cwd();
    process.chdir(projectRoot);
    try {
      mkdirSync(path.join(staleDir, '.convex'), { recursive: true });
      writeFileSync(path.join(staleDir, '.convex', 'keep-me'), 'stale');
      symlinkSync(path.join(staleDir, '.convex'), path.join(projectRoot, '.convex'));

      linkDataDirectory(dataDir);

      const convexLinkPath = path.join(projectRoot, '.convex');
      expect(lstatSync(convexLinkPath).isSymbolicLink()).toBe(true);
      expect(path.resolve(path.dirname(convexLinkPath), readlinkSync(convexLinkPath))).toBe(
        path.resolve(path.join(dataDir, '.convex'))
      );
      expect(existsSync(path.join(staleDir, '.convex', 'keep-me'))).toBe(true);
    } finally {
      process.chdir(previousCwd);
    }
  });

  test('refuses to replace a real .convex directory without an explicit runtime flag', () => {
    const projectRoot = mkdtempSync(path.join(tmpdir(), 'groam-runtime-'));
    const dataDir = path.join(projectRoot, 'data');
    tempRoots.push(projectRoot);

    const previousCwd = process.cwd();
    process.chdir(projectRoot);
    try {
      const convexPath = path.join(projectRoot, '.convex');
      mkdirSync(convexPath, { recursive: true });
      writeFileSync(path.join(convexPath, 'local-db'), 'do-not-delete');

      expect(() =>
        linkDataDirectory(dataDir, { dataDirIsSet: false, replaceExistingDirectory: false })
      ).toThrow('Refusing to replace existing .convex path');
      expect(lstatSync(convexPath).isDirectory()).toBe(true);
      expect(existsSync(path.join(convexPath, 'local-db'))).toBe(true);
    } finally {
      process.chdir(previousCwd);
    }
  });

  test('replaces a real .convex directory only when GROAM_DATA_DIR and replace flag are set', () => {
    const projectRoot = mkdtempSync(path.join(tmpdir(), 'groam-runtime-'));
    const dataDir = path.join(projectRoot, 'data');
    tempRoots.push(projectRoot);

    const previousCwd = process.cwd();
    process.chdir(projectRoot);
    try {
      mkdirSync(path.join(projectRoot, '.convex'), { recursive: true });
      linkDataDirectory(dataDir, { dataDirIsSet: true, replaceExistingDirectory: true });

      expect(lstatSync(path.join(projectRoot, '.convex')).isSymbolicLink()).toBe(true);
    } finally {
      process.chdir(previousCwd);
    }
  });
});
