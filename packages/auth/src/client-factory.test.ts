import { afterEach, expect, test, vi } from 'vite-plus/test';
import { createGroamAuthClient } from './client-factory';

afterEach(() => vi.unstubAllGlobals());

test('password sign-in with a callbackURL does not navigate the SPA document', async () => {
  const documentURL = window.location.href;
  // A hash destination catches an accidental default redirect without destroying the runner.
  const callbackURL = `${documentURL}#unexpected-auth-navigation`;
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue(Response.json({ redirect: true, url: callbackURL }))
  );
  const client = createGroamAuthClient('https://auth.example.com');
  await client.signIn.email({ callbackURL, email: 'person@example.com', password: 'Safe-1234' });
  expect(window.location.href).toBe(documentURL);
});
