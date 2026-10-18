import { describe, expect, test } from 'vite-plus/test';
import { commands } from 'vite-plus/test/browser';
import { openSite, sitePages } from './site-frame';

describe.each(sitePages)('%s', (path) => {
  test('renders one heading, the shared navigation, and no errors', async () => {
    const { site, document } = await openSite(path);
    await expect.element(site.getByRole('heading', { level: 1 })).toBeVisible();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    await expect.element(site.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect.element(site.getByRole('contentinfo')).toBeInTheDocument();
    expect(document.title).toMatch(/Groam/u);
    expect(
      document.querySelector('meta[name="description"]')?.getAttribute('content')
    ).toBeTruthy();
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch(/\/$/u);
    expect(await commands.takeErrors()).toEqual([]);
    // Escapes written into markup by mistake render literally.
    expect(document.body.textContent).not.toMatch(/\\u[0-9a-f]{4}|&amp;[a-z]+;/iu);
  });

  test.each([320, 390, 768, 1024, 1440, 1920])(
    'fits %ipx without sideways scrolling',
    async (width) => {
      const { document } = await openSite(path, { width, height: 800 });
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    }
  );

  test('links only to pages that exist', async () => {
    const { document } = await openSite(path);
    const internal = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')].map(
      (link) => new URL(link.getAttribute('href') ?? '/', location.origin)
    );
    for (const url of new Set(internal.map((u) => u.pathname))) {
      const file = url.endsWith('/') ? `${url}index.html` : url;
      const response = await fetch(file);
      expect(response.ok, `${path} links to ${url}`).toBe(true);
    }
    for (const url of internal.filter((u) => u.hash && u.pathname === path)) {
      expect(
        document.getElementById(url.hash.slice(1)),
        `${path} anchor ${url.hash}`
      ).not.toBeNull();
    }
  });

  test('shows a complete still page when the visitor prefers reduced motion', async () => {
    const { document } = await openSite(path, { reducedMotion: true });
    const running = document
      .getAnimations()
      .filter(
        (animation) =>
          animation.playState === 'running' && animation.effect?.getTiming().iterations === Infinity
      );
    expect(running).toHaveLength(0);
    expect(await commands.takeErrors()).toEqual([]);
  });
});

test('the 404 page offers a way back and is not indexed', async () => {
  const { site, document } = await openSite('/404.html');
  await expect.element(site.getByRole('heading', { level: 1 })).toBeVisible();
  expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toMatch(
    /noindex/u
  );
  expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  await expect.element(site.getByRole('link', { name: /home/iu }).first()).toBeVisible();
});

test('the sitemap lists every page', async () => {
  const sitemap = await (await fetch('/sitemap.xml')).text();
  for (const path of sitePages) expect(sitemap).toContain(`${path}</loc>`);
});
