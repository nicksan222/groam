import { env } from '@groam/env/production';
import { productionTarget, type ProductionTarget } from './target';

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;
const landingPaths = [
  '/',
  '/features/',
  '/features/itinerary/',
  '/features/ideas/',
  '/features/issues/',
  '/features/conversations/',
  '/features/ai/',
  '/pricing/',
  '/privacy/',
  '/terms/'
];

async function responseAt(fetcher: Fetch, url: string) {
  return fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
}

async function assertHtml(response: Response, status: number, language?: string): Promise<string> {
  if (response.status !== status || !response.headers.get('content-type')?.includes('text/html'))
    throw new Error(
      `Hosted route returned an unexpected status or content type (expected HTML ${status}).`
    );
  const html = await response.text();
  if (language && !new RegExp(`<html\\s[^>]*lang=["']${language}["']`, 'u').test(html))
    throw new Error(`Hosted landing page is missing its ${language} language marker.`);
  return html;
}

async function landingPage(
  target: ProductionTarget,
  fetcher: Fetch,
  path: string,
  language: string
) {
  const route = language === 'it' ? `/it${path}` : path;
  const html = await assertHtml(
    await responseAt(fetcher, `${target.siteUrl}${route}`),
    200,
    language
  );
  return { path, language, html };
}

async function smokeLanding(target: ProductionTarget, fetcher: Fetch): Promise<void> {
  const pages = await Promise.all(
    landingPaths.flatMap((path) =>
      ['en', 'it'].map((language) => landingPage(target, fetcher, path, language))
    )
  );
  const landing = pages.find((page) => page.path === '/' && page.language === 'en')?.html ?? '';
  if (
    !landing.includes(`href="${target.appUrl}"`) ||
    !landing.includes(`href="${target.siteUrl}/"`)
  )
    throw new Error('The landing build points at the wrong app or canonical origin.');
}

async function smokeApp(target: ProductionTarget, fetcher: Fetch): Promise<void> {
  const app = await assertHtml(await responseAt(fetcher, target.appUrl), 200);
  if (!/<script[^>]+src=["']\/app\//u.test(app))
    throw new Error('The web build is missing its /app/ asset base.');
  await assertHtml(await responseAt(fetcher, `${target.appUrl}settings`), 200);
  const session = await responseAt(fetcher, `${target.backendSiteUrl}/api/auth/get-session`);
  if (
    ![200, 401].includes(session.status) ||
    !session.headers.get('content-type')?.includes('application/json')
  )
    throw new Error('The auth endpoint is unavailable or shadowed by static hosting.');
  const assetPath = /<script[^>]+src=["']([^"']+)["']/u.exec(app)?.[1];
  if (!assetPath?.startsWith('/app/')) throw new Error('No production app entry asset found.');
  const asset = await fetcher(new URL(assetPath, target.siteUrl).href, {
    signal: AbortSignal.timeout(15_000)
  });
  if (!asset.ok || !/(javascript|ecmascript)/u.test(asset.headers.get('content-type') ?? ''))
    throw new Error('The app entry asset is unavailable or has the wrong content type.');
}

async function smokeFallbacks(target: ProductionTarget, fetcher: Fetch): Promise<void> {
  await assertHtml(
    await responseAt(fetcher, `${target.siteUrl}/missing-production-check/`),
    404,
    'en'
  );
  await assertHtml(
    await responseAt(fetcher, `${target.siteUrl}/it/missing-production-check/`),
    404,
    'it'
  );
  await Promise.all(
    ['/missing-production-check.js', '/app/missing-production-check.js'].map(async (path) => {
      if ((await responseAt(fetcher, `${target.siteUrl}${path}`)).status !== 404)
        throw new Error('A missing asset was mistaken for an application route.');
    })
  );
}

/** Only public GET requests: no data mutations or deployment credential. */
export async function smokeProduction(
  target: ProductionTarget,
  fetcher: (input: string, init?: RequestInit) => Promise<Response> = fetch
): Promise<void> {
  await smokeLanding(target, fetcher);
  await smokeApp(target, fetcher);
  await smokeFallbacks(target, fetcher);
}

if (import.meta.main) {
  await smokeProduction(
    productionTarget(env.convexUrl, env.siteUrl, env.cloudflareAccountId, env.cloudflareWorkerName)
  );
  console.log(
    'Production smoke checks passed: landing, Italian routes, app, auth, assets, and 404s.'
  );
}
