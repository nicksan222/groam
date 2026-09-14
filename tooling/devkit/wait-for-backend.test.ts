import { describe, expect, test } from 'bun:test';
import {
  isConvexBackendResponding,
  resolveWaitTimeoutMs,
  waitForBackend
} from './wait-for-backend';

describe('isConvexBackendResponding', () => {
  test('probes the Convex instance_name endpoint', async () => {
    let requestedUrl = '';

    const isRunning = await isConvexBackendResponding('http://127.0.0.1:3210', async (input) => {
      requestedUrl = input.toString();
      return new Response('anonymous-agent');
    });

    expect(isRunning).toBe(true);
    expect(requestedUrl).toBe('http://127.0.0.1:3210/instance_name');
  });

  test('treats empty or failing responses as unavailable', async () => {
    expect(await isConvexBackendResponding('', async () => new Response('unexpected'))).toBe(false);
    expect(
      await isConvexBackendResponding(
        'http://127.0.0.1:3210',
        async () => new Response('', { status: 503 })
      )
    ).toBe(false);
    expect(
      await isConvexBackendResponding('http://127.0.0.1:3210', async () => {
        throw new Error('connection refused');
      })
    ).toBe(false);
  });
});

describe('waitForBackend', () => {
  test('returns once the instance_name probe succeeds', async () => {
    let polls = 0;

    await waitForBackend('http://127.0.0.1:3210', {
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

  test('waits for an extra readiness check after the HTTP probe', async () => {
    let extraChecks = 0;

    await waitForBackend('http://127.0.0.1:3210', {
      extraReady: async () => {
        extraChecks += 1;
        return extraChecks >= 2;
      },
      fetchBackend: async () => new Response('anonymous-agent'),
      now: () => 0,
      sleep: async () => {},
      timeoutMs: 1_000
    });

    expect(extraChecks).toBe(2);
  });

  test('throws when the backend never becomes ready', async () => {
    let currentTime = 0;

    await expect(
      waitForBackend('http://127.0.0.1:3210', {
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

describe('resolveWaitTimeoutMs', () => {
  test('prefers millisecond overrides, then second-based cloud timeouts', () => {
    expect(resolveWaitTimeoutMs({ startupTimeoutMs: 60_000 })).toBe(60_000);
    expect(resolveWaitTimeoutMs({ readyTimeoutSeconds: 240 })).toBe(240_000);
    expect(resolveWaitTimeoutMs({})).toBe(180_000);
  });
});
