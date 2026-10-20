import { expect, test } from 'vite-plus/test';
import worker from './cloudflare-worker';

const assets = {
  async fetch(request: Request) {
    const path = new URL(request.url).pathname;
    if (
      [
        '/index.html',
        '/app/index.html',
        '/it/index.html',
        '/pricing/index.html',
        '/it/pricing/index.html',
        '/it/404/index.html',
        '/404.html'
      ].includes(path)
    )
      return new Response(path, { headers: { 'content-type': 'text/html' } });
    return new Response('missing', { status: 404 });
  }
};
const request = (path: string, method = 'GET') =>
  new Request(`https://groam.example${path}`, { method });

test('serves app deep links and keeps missing scripts as 404s', async () => {
  expect(await (await worker.fetch(request('/app/settings'), { ASSETS: assets })).text()).toBe(
    '/app/index.html'
  );
  expect((await worker.fetch(request('/app/missing.js'), { ASSETS: assets })).status).toBe(404);
  expect((await worker.fetch(request('/missing.js'), { ASSETS: assets })).status).toBe(404);
});

test.each(['/pricing', '/it', '/it/pricing'])(
  'redirects a real landing directory to its canonical slash URL: %s',
  async (path) => {
    const response = await worker.fetch(request(`${path}?campaign=launch`), { ASSETS: assets });
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(`${path}/?campaign=launch`);
  }
);

test('does not redirect nonexistent directories or missing assets', async () => {
  for (const path of ['/unknown', '/it/unknown', '/missing.js']) {
    const response = await worker.fetch(request(path), { ASSETS: assets });
    expect(response.status).toBe(404);
    expect(response.headers.has('location')).toBe(false);
  }
});
test('returns localized landing 404s without falling back to the app', async () => {
  const response = await worker.fetch(request('/it/missing/'), { ASSETS: assets });
  expect(response.status).toBe(404);
  expect(await response.text()).toBe('/it/404/index.html');
  expect((await worker.fetch(request('/missing/'), { ASSETS: assets })).status).toBe(404);
});
test('redirects the app mount and refuses writes at the static edge', async () => {
  const response = await worker.fetch(request('/app?next=trip'), { ASSETS: assets });
  expect(response.status).toBe(308);
  expect(response.headers.get('location')).toBe('/app/?next=trip');
  expect((await worker.fetch(request('/app/'), { ASSETS: assets })).status).toBe(200);
  expect((await worker.fetch(request('/'), { ASSETS: assets })).status).toBe(200);
  expect((await worker.fetch(request('/', 'POST'), { ASSETS: assets })).status).toBe(405);
});
