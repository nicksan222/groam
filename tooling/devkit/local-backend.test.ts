import { describe, expect, test } from 'bun:test';
import { isLocalBackendRunning, localBackendProcessIds, stopLocalBackend } from './local-backend';

describe('isLocalBackendRunning', () => {
  test('probes the backend URL selected by Convex', async () => {
    let requestedUrl = '';

    const isRunning = await isLocalBackendRunning('http://127.0.0.1:3214', async (input) => {
      requestedUrl = input.toString();
      return new Response('anonymous-agent');
    });

    expect(isRunning).toBe(true);
    expect(requestedUrl).toBe('http://127.0.0.1:3214/instance_name');
  });

  test('does not mistake another HTTP server for a Convex backend', async () => {
    const isRunning = await isLocalBackendRunning(
      'http://127.0.0.1:3214',
      async () => new Response('', { status: 404 })
    );

    expect(isRunning).toBe(false);
  });

  test('treats an unreachable or unconfigured backend as stopped', async () => {
    expect(await isLocalBackendRunning('', async () => new Response('unexpected'))).toBe(false);
    expect(
      await isLocalBackendRunning('http://127.0.0.1:3214', async () => {
        throw new Error('connection refused');
      })
    ).toBe(false);
  });

  test('finds only the selected project backend process', () => {
    const processes = `
      101 /cache/convex-local-backend --port 3214 /repo/.convex/local/default/backend.sqlite3
      102 /cache/convex-local-backend --port 3210 /repo/.convex/local/default/backend.sqlite3
      103 /cache/convex-local-backend --port 3214 /other/.convex/local/default/backend.sqlite3
      104 vite --host 0.0.0.0
    `;

    expect(localBackendProcessIds(processes, 'http://127.0.0.1:3214', '/repo')).toEqual([101]);
  });

  test('stops the selected local backend and waits for its port to close', async () => {
    const signals: Array<[number, NodeJS.Signals]> = [];
    let probes = 0;
    const stopped = await stopLocalBackend('http://127.0.0.1:3214', '/repo', {
      fetchBackend: async () => {
        probes += 1;
        if (probes === 1) return new Response('anonymous-agent');
        throw new Error('connection refused');
      },
      killProcess: (pid, signal) => {
        signals.push([pid, signal]);
      },
      listProcesses: () =>
        '101 /cache/convex-local-backend --port 3214 /repo/.convex/local/default/backend.sqlite3',
      wait: async () => {}
    });

    expect(stopped).toBe(true);
    expect(signals).toEqual([[101, 'SIGTERM']]);
  });
});
