import { expect, test } from 'vite-plus/test';
import { smokeProduction } from './smoke';
import { productionTarget } from './target';

const target = productionTarget(
  'https://groam-demo.convex.cloud',
  'https://groam-demo.convex.site'
);
const html = (body: string, language = 'en', status = 200) =>
  new Response(`<html lang="${language}">${body}</html>`, {
    status,
    headers: { 'content-type': 'text/html' }
  });
const routes = async (input: string) => {
  const { pathname } = new URL(input);
  if (pathname.endsWith('missing-production-check.js')) return new Response('', { status: 404 });
  if (pathname === '/app/entry.js')
    return new Response('export {};', { headers: { 'content-type': 'text/javascript' } });
  if (pathname === '/api/auth/get-session') return Response.json(null);
  if (pathname.startsWith('/app/'))
    return html('<script type="module" src="/app/entry.js"></script>');
  return html(
    `<a href="${target.appUrl}">App</a><link rel="canonical" href="${target.siteUrl}/">`,
    pathname.startsWith('/it/') ? 'it' : 'en',
    pathname.includes('missing-production-check/') ? 404 : 200
  );
};

test('checks the production entry points without credentials or data mutations', async () => {
  const calls: string[] = [];
  await smokeProduction(target, (url, init) => {
    calls.push(url);
    expect(init?.method).toBeUndefined();
    expect(init?.headers).toBeUndefined();
    return routes(url);
  });
  expect(calls).toContain(`${target.siteUrl}/it/features/ai/`);
  expect(calls).toContain(`${target.siteUrl}/app/settings`);
  expect(calls).toContain(`${target.siteUrl}/api/auth/get-session`);
});

test.each(['auth', 'missing-asset', 'language', 'app-base'])(
  'rejects a broken %s deployment',
  async (broken) => {
    await expect(
      smokeProduction(target, async (url) => {
        if (broken === 'auth' && url.endsWith('/api/auth/get-session')) return html('wrong host');
        if (broken === 'missing-asset' && url.endsWith('.js')) return html('SPA fallback');
        if (broken === 'language' && url.includes('/it/')) return html('wrong language');
        if (broken === 'app-base' && url.endsWith('/app/'))
          return html('<script src="/assets/entry.js"></script>');
        return routes(url);
      })
    ).rejects.toThrow();
  }
);
