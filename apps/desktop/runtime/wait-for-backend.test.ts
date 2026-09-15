import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { canRunConvexSmoke, isBackendResponding, waitForBackend } from './wait-for-backend';

describe('isBackendResponding', () => {
  test('probes the Convex instance_name endpoint', async () => {
    let requestedUrl = '';

    const isRunning = await isBackendResponding('http://127.0.0.1:3210', async (input) => {
      requestedUrl = input.toString();
      return new Response('anonymous-agent');
    });

    expect(isRunning).toBe(true);
    expect(requestedUrl).toBe('http://127.0.0.1:3210/instance_name');
  });

  test('treats empty or failing responses as unavailable', async () => {
    expect(await isBackendResponding('', async () => new Response('unexpected'))).toBe(false);
    expect(
      await isBackendResponding(
        'http://127.0.0.1:3210',
        async () => new Response('', { status: 503 })
      )
    ).toBe(false);
    expect(
      await isBackendResponding('http://127.0.0.1:3210', async () => {
        throw new Error('connection refused');
      })
    ).toBe(false);
  });
});

describe('canRunConvexSmoke', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('requires a local env file before running the smoke command', async () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'groam-runtime-smoke-'));
    tempRoots.push(tempRoot);

    await expect(canRunConvexSmoke(path.join(tempRoot, '.env.local'))).resolves.toBe(false);
  });

  test('accepts a successful convex smoke command', async () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'groam-runtime-smoke-'));
    tempRoots.push(tempRoot);
    const envPath = path.join(tempRoot, '.env.local');
    writeFileSync(envPath, 'VITE_CONVEX_URL=http://127.0.0.1:3210\n');

    await expect(canRunConvexSmoke(envPath, async () => 0)).resolves.toBe(true);
  });
});

describe('waitForBackend', () => {
  test('returns once the backend and smoke checks both pass', async () => {
    let polls = 0;

    await waitForBackend('http://127.0.0.1:3210', {
      canRunSmoke: async () => polls >= 1,
      fetchBackend: async () => {
        polls += 1;
        return new Response('anonymous-agent');
      },
      now: () => 0,
      sleep: async () => {},
      timeoutMs: 1_000
    });

    expect(polls).toBe(1);
  });

  test('throws when the backend never becomes ready', async () => {
    let currentTime = 0;

    await expect(
      waitForBackend('http://127.0.0.1:3210', {
        canRunSmoke: async () => false,
        fetchBackend: async () => new Response('', { status: 503 }),
        now: () => currentTime,
        sleep: async () => {
          currentTime += 2_000;
        },
        timeoutMs: 1_000
      })
    ).rejects.toThrow('Convex backend did not become ready within 1000ms');
  });
});
