import { describe, expect, test } from 'bun:test';
import { localOrigins } from './constants';
import { isDevStackResponding, waitForDevStack } from './wait-for-dev-stack';

describe('isDevStackResponding', () => {
  test('requires the Convex backend, deployed auth route, and Vite', async () => {
    const requested: string[] = [];

    const healthy = await isDevStackResponding(
      localOrigins.convexApi,
      {
        auth: `${localOrigins.convexSite}/api/auth/get-session`,
        dashboard: `${localOrigins.dashboard}/`,
        vite: `${localOrigins.viteLoopback}/`
      },
      async (input) => {
        requested.push(input.toString());
        if (input.toString().includes('/instance_name')) {
          return new Response('anonymous-agent');
        }
        return new Response('vite');
      }
    );

    expect(healthy).toBe(true);
    expect(requested).toContain('http://127.0.0.1:3210/instance_name');
    expect(requested).toContain('http://127.0.0.1:3211/api/auth/get-session');
    expect(requested).toContain('http://127.0.0.1:5173/');
  });
});

describe('waitForDevStack', () => {
  test('waits for the deployed auth route before reporting readiness', async () => {
    let authProbes = 0;

    const { dashboardReady } = await waitForDevStack(localOrigins.convexApi, {
      fetchBackend: async (input) => {
        if (input.toString().includes('/api/auth/get-session')) {
          authProbes += 1;
          return new Response('', { status: authProbes >= 2 ? 200 : 404 });
        }
        if (input.toString().includes('6790')) return new Response('', { status: 503 });
        return new Response('ok');
      },
      now: () => 0,
      sleep: async () => {},
      timeoutMs: 1_000
    });

    expect(authProbes).toBe(2);
    expect(dashboardReady).toBe(false);
  });
});
