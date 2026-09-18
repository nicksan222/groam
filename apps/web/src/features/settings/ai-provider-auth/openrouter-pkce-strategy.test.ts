import { beforeEach, describe, expect, test, vi } from 'vitest';
import { aiProviderAuthStrategy } from './registry';

const strategy = aiProviderAuthStrategy('openrouter');
if (!strategy) throw new Error('Expected the OpenRouter authentication strategy');

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('OpenRouterPkceStrategy', () => {
  test('is selected only for OpenRouter', () => {
    expect(strategy.provider).toBe('openrouter');
    expect(aiProviderAuthStrategy('openai')).toBeNull();
  });

  test('starts a PKCE authorization without persisting the verifier itself', async () => {
    const start = await strategy.begin('https://groam.example/settings/ai');
    const url = new URL(start.authorizationUrl);
    expect(url.origin + url.pathname).toBe('https://openrouter.ai/auth');
    expect(url.searchParams.get('callback_url')).toBe('https://groam.example/settings/ai');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(start.data.verifier).toBeTruthy();
  });

  test('exchanges a callback code for an API key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ key: 'sk-or-oauth' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      strategy.complete(new URL('https://groam.example/settings/ai?code=oauth-code'), {
        verifier: 'test-verifier'
      })
    ).resolves.toBe('sk-or-oauth');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/auth/keys',
      expect.objectContaining({
        body: JSON.stringify({
          code: 'oauth-code',
          code_challenge_method: 'S256',
          code_verifier: 'test-verifier'
        }),
        method: 'POST'
      })
    );
  });

  test('recognizes callbacks and rejects an expired session', async () => {
    expect(strategy.hasCallback(new URL('https://groam.example/settings/ai'))).toBe(false);
    expect(strategy.hasCallback(new URL('https://groam.example/settings/ai?code=oauth-code'))).toBe(
      true
    );
    await expect(
      strategy.complete(new URL('https://groam.example/settings/ai?code=oauth-code'), {})
    ).rejects.toThrow('connection expired');
  });

  test('surfaces exchange and malformed-response failures', async () => {
    const callback = new URL('https://groam.example/settings/ai?code=oauth-code');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
    await expect(strategy.complete(callback, { verifier: 'test-verifier' })).rejects.toThrow(
      'could not complete'
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        })
      )
    );
    await expect(strategy.complete(callback, { verifier: 'test-verifier' })).rejects.toThrow(
      'did not return an API key'
    );
  });
});
