import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareVercel } from '@groam/deploy/vercel';
import { expect, test } from 'vite-plus/test';

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'groam-vercel-'));
  const landing = join(directory, 'landing');
  const web = join(directory, 'web');
  mkdirSync(join(landing, 'it/privacy'), { recursive: true });
  mkdirSync(join(landing, 'assets'));
  mkdirSync(join(web, 'assets'), { recursive: true });
  writeFileSync(join(landing, 'index.html'), 'landing home');
  writeFileSync(join(landing, '404.html'), 'not found');
  writeFileSync(join(landing, 'it/privacy/index.html'), 'privacy');
  writeFileSync(join(landing, 'assets/landing.js'), 'landing script');
  writeFileSync(join(web, 'index.html'), 'web home');
  writeFileSync(join(web, 'assets/app.js'), 'web script');
  writeFileSync(join(directory, '.env.local'), 'private');
  const destination = join(directory, 'deployment');
  prepareVercel({ landing, web, destination, projectId: 'prj_test', orgId: 'team_test' });
  const output = join(destination, '.vercel/output');
  const config = JSON.parse(readFileSync(join(output, 'config.json'), 'utf8')) as {
    version: number;
    routes: {
      src?: string;
      dest?: string;
      handle?: string;
      status?: number;
      headers?: Record<string, string>;
    }[];
  };
  return { directory, output, config };
}

test('packages landing at root and web under app without checkout files', () => {
  const { directory, output } = fixture();
  try {
    expect(readFileSync(join(output, 'static/index.html'), 'utf8')).toBe('landing home');
    expect(readFileSync(join(output, 'static/assets/landing.js'), 'utf8')).toBe('landing script');
    expect(readFileSync(join(output, 'static/app/index.html'), 'utf8')).toBe('web home');
    expect(readFileSync(join(output, 'static/app/assets/app.js'), 'utf8')).toBe('web script');
    expect(() => readFileSync(join(output, 'static/.env.local'))).toThrow();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('routes Astro directories, app assets and SPA deep links on one origin', () => {
  const { directory, config } = fixture();
  try {
    expect(config.version).toBe(3);
    expect(config.routes).toContainEqual({
      src: '^/app$',
      status: 308,
      headers: { Location: '/app/' }
    });
    expect(config.routes.find((route) => route.src === '^/it/privacy$')).toEqual({
      src: '^/it/privacy$',
      status: 308,
      headers: { Location: '/it/privacy/' }
    });
    expect(config.routes.find((route) => route.src === '^/it/privacy/$')?.dest).toBe(
      '/it/privacy/index.html'
    );
    const filesystem = config.routes.findIndex((route) => route.handle === 'filesystem');
    const spa = config.routes.findIndex((route) => route.dest === '/app/index.html');
    const notFound = config.routes.findIndex((route) => route.status === 404);
    expect(filesystem).toBeGreaterThan(-1);
    expect(spa).toBeGreaterThan(filesystem);
    expect(new RegExp(config.routes[spa]?.src ?? '').test('/app/settings/ai')).toBe(true);
    expect(notFound).toBeGreaterThan(spa);
    expect(config.routes[notFound]?.dest).toBe('/404.html');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
