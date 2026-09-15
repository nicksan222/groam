import { describe, expect, test } from 'bun:test';
import { localOrigins } from './constants';
import {
  isDevStackResponding,
  parseDevStackTimeoutMs,
  waitForDevStack
} from './wait-for-dev-stack';

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
  test('accepts a separate outer readiness timeout', () => {
    expect(parseDevStackTimeoutMs(['--timeout-ms', '420000'])).toBe(420_000);
  });

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

  test('uses one timeout budget for every required service', async () => {
    let currentTime = 0;

    await expect(
      waitForDevStack(localOrigins.convexApi, {
        fetchBackend: async (input) => {
          if (input.toString().includes('/instance_name')) {
            return new Response(currentTime >= 4_000 ? 'anonymous-agent' : '', {
              status: currentTime >= 4_000 ? 200 : 503
            });
          }
          if (input.toString().includes('/api/auth/get-session')) {
            return new Response('', { status: 404 });
          }
          return new Response('ok');
        },
        now: () => currentTime,
        sleep: async (milliseconds) => {
          currentTime += milliseconds;
        },
        timeoutMs: 5_000
      })
    ).rejects.toThrow('Dev stack did not become ready within 5000ms');

    expect(currentTime).toBe(6_000);
  });
});
