import { env } from '@groam/env/production';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, test } from 'vite-plus/test';
import { environments } from '#src/environments';
import { releaseTarget } from '#src/release/target';

// Runs against a live environment after its release (GROAM_ENVIRONMENT selects which), with a real
// browser and no credentials: what a signed-out visitor sees on the web app and the landing site.
const target = releaseTarget(env.environment, environments[env.environment]);

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});

/** Opens a page and records uncaught errors and console errors from the start. */
async function visit(url: string): Promise<{ page: Page; status: number; errors: string[] }> {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const response = await page.goto(url, { waitUntil: 'load' });
  return { page, status: response?.status() ?? 0, errors };
}

describe(`${env.environment} web app (${target.siteUrl})`, () => {
  test('a signed-out visitor gets the sign-in screen with working legal links', async () => {
    const { page, status, errors } = await visit(target.siteUrl);
    expect(status).toBe(200);
    const terms = page.getByRole('link', { name: 'Terms of Service' });
    await terms.waitFor();
    expect(await terms.getAttribute('href')).toBe(new URL('/terms/', target.landingUrl).href);
    expect(await page.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe(
      new URL('/privacy/', target.landingUrl).href
    );
    expect(errors).toEqual([]);
    await page.close();
  });

  test('deep links load the app and send signed-out visitors to sign in', async () => {
    const { page, status, errors } = await visit(new URL('/trips', target.siteUrl).href);
    expect(status).toBe(200);
    await page.getByRole('link', { name: 'Terms of Service' }).waitFor();
    expect(errors).toEqual([]);
    await page.close();
  });

  test('serves static files and 404s missing ones', async () => {
    expect((await fetch(new URL('/favicon.ico', target.siteUrl))).status).toBe(200);
    expect((await fetch(new URL('/missing-asset.js', target.siteUrl))).status).toBe(404);
  });

  test('reaches the Convex auth backend', async () => {
    const response = await fetch(new URL('/api/auth/get-session', target.backendSiteUrl), {
      headers: { origin: target.siteUrl }
    });
    expect(response.status).toBe(200);
  });
});

describe(`${env.environment} landing site (${target.landingUrl})`, () => {
  test.each(['/', '/terms/', '/privacy/', '/pricing/'])(
    '%s renders without errors',
    async (path) => {
      const { page, status, errors } = await visit(new URL(path, target.landingUrl).href);
      expect(status).toBe(200);
      expect(await page.locator('h1').count()).toBe(1);
      expect(errors).toEqual([]);
      await page.close();
    }
  );

  test('unknown pages return 404', async () => {
    expect((await fetch(new URL('/no-such-page/', target.landingUrl))).status).toBe(404);
  });
});
