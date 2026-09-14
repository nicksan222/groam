import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { configureAuth, upsertViteSiteUrl } from './configure-auth';

describe('upsertViteSiteUrl', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('appends VITE_SITE_URL when missing and replaces it when present', () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'groam-devkit-auth-'));
    tempRoots.push(tempRoot);
    const envPath = path.join(tempRoot, '.env.local');

    upsertViteSiteUrl(envPath, 'http://localhost:5173');
    expect(readFileSync(envPath, 'utf8')).toContain('VITE_SITE_URL=http://localhost:5173');

    writeFileSync(envPath, 'VITE_SITE_URL=http://127.0.0.1:3211\n');
    upsertViteSiteUrl(envPath, 'http://localhost:5173');
    expect(readFileSync(envPath, 'utf8')).toBe('VITE_SITE_URL=http://localhost:5173\n');
  });
});

describe('configureAuth', () => {
  test('sets SITE_URL and only creates a secret when the deployment lacks one', () => {
    const commands: string[][] = [];

    configureAuth({
      randomSecret: () => 'test-secret',
      run: (args) => {
        commands.push([...args]);
        if (args[0] === 'env' && args[1] === 'list') {
          return { status: 0, stderr: '', stdout: 'SITE_URL\n' };
        }
        return { status: 0, stderr: '', stdout: '' };
      },
      siteUrl: 'http://localhost:5173',
      writeViteSiteUrl: false
    });

    expect(commands).toEqual([
      ['env', 'list', '--names-only'],
      ['env', 'set', 'BETTER_AUTH_SECRET'],
      ['env', 'set', 'SITE_URL', 'http://localhost:5173']
    ]);
  });

  test('does not rotate an existing Better Auth secret', () => {
    const commands: string[][] = [];

    configureAuth({
      run: (args) => {
        commands.push([...args]);
        if (args[0] === 'env' && args[1] === 'list') {
          return { status: 0, stderr: '', stdout: 'BETTER_AUTH_SECRET\nSITE_URL\n' };
        }
        return { status: 0, stderr: '', stdout: '' };
      },
      siteUrl: 'http://127.0.0.1:3211'
    });

    expect(commands).toEqual([
      ['env', 'list', '--names-only'],
      ['env', 'set', 'SITE_URL', 'http://127.0.0.1:3211']
    ]);
  });
});
