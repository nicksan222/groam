import { describe, expect, test } from 'vite-plus/test';
import { openSite, sitePages } from './site-frame';

const ogImage: Record<(typeof sitePages)[number], string> = {
  '/': '/og/home.png',
  '/features/': '/og/features.png',
  '/features/itinerary/': '/og/itinerary.png',
  '/features/ideas/': '/og/ideas.png',
  '/features/issues/': '/og/issues.png',
  '/features/conversations/': '/og/conversations.png',
  '/features/ai/': '/og/ai.png',
  '/pricing/': '/og/pricing.png',
  '/privacy/': '/og/privacy.png',
  '/terms/': '/og/terms.png'
};

describe.each(sitePages)('%s', (path) => {
  test('shares its own card and canonical address', async () => {
    const { document } = await openSite(path);
    const meta = (selector: string) =>
      document.querySelector(selector)?.getAttribute('content') ?? '';
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '';
    expect(new URL(canonical).pathname).toBe(path);
    expect(meta('meta[property="og:url"]')).toBe(canonical);
    const image = new URL(meta('meta[property="og:image"]'));
    expect(image.pathname).toBe(ogImage[path]);
    expect((await fetch(image.pathname)).ok).toBe(true);
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
  });
});

test('home describes the product and its prices as structured data', async () => {
  const { document } = await openSite('/');
  const script = document.querySelector('script[type="application/ld+json"]');
  const data = JSON.parse(script?.textContent ?? '{}') as {
    '@type'?: string;
    offers?: { price?: string | number; priceCurrency?: string }[];
  };
  expect(data['@type']).toBe('SoftwareApplication');
  expect(data.offers?.map((offer) => [Number(offer.price), offer.priceCurrency])).toEqual(
    expect.arrayContaining([
      [0, 'EUR'],
      [1, 'EUR']
    ])
  );
});

test('the 404 page has no canonical or share address', async () => {
  const { document } = await openSite('/404.html');
  expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  expect(document.querySelector('meta[property="og:url"]')).toBeNull();
});
