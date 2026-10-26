import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vite-plus/test';

const configured = {
  convexUrl: 'https://pastel-ocelot-555.eu-west-1.convex.cloud',
  emailFrom: 'Groam <noreply@groam.app>',
  host: 'groam.vercel.app',
  vercelOrgId: 'team_test',
  vercelProjectId: 'prj_groam'
};

function target(changes: Partial<typeof configured> = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'groam-target-'));
  try {
    writeFileSync(join(directory, 'justfile'), readFileSync('tooling/deploy/justfile'));
    writeFileSync(
      join(directory, 'environments.json'),
      JSON.stringify({ production: { ...configured, ...changes } })
    );
    return spawnSync(
      resolve('node_modules/.bin/just'),
      ['--justfile', join(directory, 'justfile'), '_target', 'production'],
      { encoding: 'utf8' }
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('release resolves one frontend origin with the web app under app', () => {
  const result = target();
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('site_url=https://groam.vercel.app/app');
  expect(result.stdout).toContain('landing_url=https://groam.vercel.app');
  expect(result.stdout).toContain(
    'backend_site_url=https://pastel-ocelot-555.eu-west-1.convex.site'
  );
  expect(result.stdout).toContain('vercel_project_id=prj_groam');
});

test.each([
  { host: '' },
  { host: 'https://groam.vercel.app/path' },
  { host: 'groam-production.convex.site' },
  { vercelOrgId: '' },
  { vercelProjectId: '../project' }
])('release rejects incomplete destinations: %j', (change) => {
  expect(target(change).status).not.toBe(0);
});
