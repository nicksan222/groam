import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { createTest } from '#testing/factory';
import { setupGroup } from '#testing/trips';

test('generates a cover upload URL for an authenticated group member', async () => {
  const { owner } = await setupGroup();
  await expect(owner.client.mutation(api.routes.trips.upload.run, {})).resolves.toMatch(
    /^https?:\/\//
  );

  await expect(createTest().mutation(api.routes.trips.upload.run, {})).rejects.toThrow(
    'Not authenticated'
  );
});
