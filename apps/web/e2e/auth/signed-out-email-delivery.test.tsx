import { api } from '@groam/backend/api';
import { expect, onTestFinished, test } from 'vite-plus/test';
import { browserConvexClient } from '@/lib/convex-client';

test('loads email availability before a visitor signs in', async () => {
  const client = browserConvexClient();
  onTestFinished(() => client.close());

  // This public query powers the sign-in screen; it must not wait for an auth token.
  await expect(client.query(api.routes.auth.email.run, {})).resolves.toBe(false);
}, 10_000);
