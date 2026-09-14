import { describe, expect, test } from 'bun:test';
import { isHttpOk, waitForHttp } from './http-readiness';

describe('isHttpOk', () => {
  test('requires a successful HTTP response', async () => {
    expect(await isHttpOk('http://127.0.0.1:5173/', async () => new Response('ok'))).toBe(true);
    expect(
      await isHttpOk('http://127.0.0.1:5173/', async () => new Response('', { status: 503 }))
    ).toBe(false);
    expect(await isHttpOk('', async () => new Response('ok'))).toBe(false);
  });
});

describe('waitForHttp', () => {
  test('returns once the URL answers successfully', async () => {
    await waitForHttp('http://127.0.0.1:5173/', {
      fetchTarget: async () => new Response('ok'),
      now: () => 0,
      sleep: async () => {},
      timeoutMs: 1_000
    });
  });
});
