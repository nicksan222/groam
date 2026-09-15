import type { AuthenticatedAppUser } from '@groam/app-actions/backend';
import { expect, test } from 'vitest';
import { seedWorkspaceTrips } from './seed-workspace-trips';

const owner: AuthenticatedAppUser = {
  cookie: 'better-auth.session_token=owner-token',
  email: 'demo@groam.example',
  name: 'Groam Demo',
  password: 'GroamDemo123!',
  status: 'existing',
  userId: 'user-owner'
};

test('keeps each complete trip in its own Convex mutation', async () => {
  const batchSizes: number[] = [];

  await seedWorkspaceTrips(
    {
      createTrips: async (_owner, plans) => {
        batchSizes.push(plans.length);
        return [];
      }
    },
    { concurrency: 8, owner, tripCount: 10 }
  );

  expect(batchSizes).toHaveLength(10);
  expect(batchSizes.every((size) => size === 1)).toBe(true);
});
