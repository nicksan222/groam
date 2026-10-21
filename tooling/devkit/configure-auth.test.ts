import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vite-plus/test';
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
  const tempRoots: string[] = [];
  const workerEnv = (contents?: string) => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'groam-devkit-worker-'));
    tempRoots.push(tempRoot);
    const workerEnvPath = path.join(tempRoot, '.env');
    if (contents !== undefined) writeFileSync(workerEnvPath, contents);
    return workerEnvPath;
  };

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('sets SITE_URL and only creates a secret when the deployment lacks one', () => {
    const commands: string[][] = [];

    configureAuth({
      workerEnvPath: workerEnv('AUTH_EMAIL_RELAY_SECRET=local\n'),
      randomSecret: () => 'test-secret',
      run: (args) => {
        commands.push([...args]);
        if (args[0] === 'env' && args[1] === 'list') {
          return { status: 0, stderr: '', stdout: 'SITE_URL\nAUTH_EMAIL_RELAY_SECRET\n' };
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
      workerEnvPath: workerEnv('AUTH_EMAIL_RELAY_SECRET=local\n'),
      run: (args) => {
        commands.push([...args]);
        if (args[0] === 'env' && args[1] === 'list') {
          return {
            status: 0,
            stderr: '',
            stdout: 'BETTER_AUTH_SECRET\nSITE_URL\nAUTH_EMAIL_RELAY_SECRET\n'
          };
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

  test('shares one email relay secret between Convex and the local Void Worker', () => {
    const commands: { args: string[]; input?: string }[] = [];
    const workerEnvPath = workerEnv('OTHER=value');
    const run = (args: readonly string[], options: { input?: string } = {}) => {
      commands.push({ args: [...args], input: options.input });
      if (args[0] === 'env' && args[1] === 'list')
        return { status: 0, stderr: '', stdout: 'BETTER_AUTH_SECRET\nSITE_URL\n' };
      return { status: 0, stderr: '', stdout: '' };
    };

    configureAuth({
      randomSecret: () => 'relay',
      run,
      siteUrl: 'http://localhost:5173',
      workerEnvPath
    });
    expect(commands.at(-1)).toEqual({
      args: ['env', 'set', 'AUTH_EMAIL_RELAY_SECRET'],
      input: 'relay\n'
    });
    expect(readFileSync(workerEnvPath, 'utf8')).toMatch(
      /^OTHER=value\n# .*\nAUTH_EMAIL_RELAY_SECRET=relay\n$/u
    );

    // A deployment reset keeps the Worker's secret and gives it back to Convex.
    commands.length = 0;
    configureAuth({
      randomSecret: () => 'new',
      run,
      siteUrl: 'http://localhost:5173',
      workerEnvPath
    });
    expect(commands.at(-1)).toEqual({
      args: ['env', 'set', 'AUTH_EMAIL_RELAY_SECRET'],
      input: 'relay\n'
    });
    expect(readFileSync(workerEnvPath, 'utf8').match(/AUTH_EMAIL_RELAY_SECRET/gu)).toHaveLength(1);
  });
});
