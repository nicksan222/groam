import type { AuthenticatedAppUser } from '@groam/app-actions/backend';
import { expect, test, vi } from 'vite-plus/test';
import { seedWorkspaceDetails } from './seed-workspace-details';

const owner = { userId: 'owner' } as AuthenticatedAppUser;

test('enriches each trip in order and aggregates only newly added fixture counts', async () => {
  let active = 0;
  const enrichTrip = vi.fn(async (_owner, { scenarioIndex }) => {
    active += 1;
    expect(active).toBe(1);
    await Promise.resolve();
    active -= 1;
    return {
      archived: scenarioIndex === 1,
      ideas: 2,
      issues: 4,
      packingItems: 5,
      researches: 3,
      stays: 1
    };
  });
  expect(
    await seedWorkspaceDetails({ enrichTrip }, { owner, tripIds: ['trip-a', 'trip-b'] })
  ).toEqual({ ideaCount: 4, issueCount: 8, packingItemCount: 10, researchCount: 6, stayCount: 2 });
  expect(enrichTrip.mock.calls.map((call) => call[1])).toEqual([
    { tripId: 'trip-a', scenarioIndex: 0 },
    { tripId: 'trip-b', scenarioIndex: 1 }
  ]);
});

test('does not enrich when no trips are requested', async () => {
  const enrichTrip = vi.fn();
  expect(await seedWorkspaceDetails({ enrichTrip }, { owner, tripIds: [] })).toEqual({
    ideaCount: 0,
    issueCount: 0,
    packingItemCount: 0,
    researchCount: 0,
    stayCount: 0
  });
  expect(enrichTrip).not.toHaveBeenCalled();
});
