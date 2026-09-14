import { describe, expect, test } from 'bun:test';
import { localOrigins } from './constants';
import { isDevStackResponding, waitForDevStack } from './wait-for-dev-stack';

describe('isDevStackResponding', () => {
  test('requires both the Convex instance_name probe and Vite', async () => {
    const requested: string[] = [];

    const healthy = await isDevStackResponding(
      localOrigins.convexApi,
      {
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
    expect(requested).toContain('http://127.0.0.1:5173/');
  });
});

describe('waitForDevStack', () => {
  test('waits for backend and Vite, then probes the dashboard', async () => {
    const { dashboardReady } = await waitForDevStack(localOrigins.convexApi, {
      fetchBackend: async (input) => {
        if (input.toString().includes('6790')) return new Response('', { status: 503 });
        return new Response('ok');
      },
      now: () => 0,
      sleep: async () => {},
      timeoutMs: 1_000
    });

    expect(dashboardReady).toBe(false);
  });
});
