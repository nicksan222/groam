import { afterEach, expect, test, vi } from 'vitest';
import { compatibleProviderFetch } from '#backend/ai/providers/compatible-fetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

test('disables automatic redirects on custom compatible endpoints', async () => {
  const fetchMock = vi.fn(async () => new Response('ok'));
  vi.stubGlobal('fetch', fetchMock);

  await compatibleProviderFetch('https://8.8.8.8/v1', { method: 'POST' });
  expect(fetchMock).toHaveBeenCalledWith(
    'https://8.8.8.8/v1',
    expect.objectContaining({ method: 'POST', redirect: 'error' })
  );
});
