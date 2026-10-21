import { afterEach, expect, test, vi } from 'vite-plus/test';
import { betaTarget, productionTarget } from '#src/release/target-fixture';
import { workerSecretNames } from '#src/void/secrets';

vi.mock('@groam/env/production', () => ({ env: { cloudflareApiToken: () => 'token' } }));
vi.mock('#src/void/lock', () => ({ lockedAccountId: () => 'b'.repeat(32) }));

afterEach(() => vi.unstubAllGlobals());

test("reads the web Worker's secret names from the configured account", async () => {
  const fetch = vi.fn(async () =>
    Response.json({ success: true, result: [{ name: 'AUTH_EMAIL_RELAY_SECRET' }] })
  );
  vi.stubGlobal('fetch', fetch);
  expect(await workerSecretNames(productionTarget)).toEqual(new Set(['AUTH_EMAIL_RELAY_SECRET']));
  expect(fetch).toHaveBeenCalledWith(
    `https://api.cloudflare.com/client/v4/accounts/${'a'.repeat(32)}/workers/scripts/groam-app/secrets`,
    expect.objectContaining({ headers: { authorization: 'Bearer token' } })
  );
});

test('names the Worker when Cloudflare refuses', async () => {
  vi.stubGlobal('fetch', async () => new Response(null, { status: 404 }));
  await expect(workerSecretNames(productionTarget)).rejects.toThrow(
    'web Worker (groam-app) secrets request failed (404).'
  );
});

test('falls back to the account in the committed Void lock', async () => {
  const fetch = vi.fn(async () => Response.json({ success: true, result: [] }));
  vi.stubGlobal('fetch', fetch);
  await workerSecretNames(betaTarget);
  expect(fetch).toHaveBeenCalledWith(
    `https://api.cloudflare.com/client/v4/accounts/${'b'.repeat(32)}/workers/scripts/groam-app-beta/secrets`,
    expect.anything()
  );
});
