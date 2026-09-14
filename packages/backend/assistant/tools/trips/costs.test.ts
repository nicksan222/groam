import { expect, test, vi } from 'vitest';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import { createSetItineraryCostTool } from '#backend/assistant/tools/trips/costs';

test('updates an itinerary cost with mocked trip context and mutation', async () => {
  const mutations: unknown[] = [];
  const tool = createSetItineraryCostTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
    },
    runQuery: async () => ({
      canEdit: true,
      proposalStatus: 'draft',
      costTargets: [{ id: 'stay-1', kind: 'stay', label: 'Hotel Tejo' }],
      currency: 'EUR'
    })
  };

  await expect(
    tool.execute(context, { amount: 240, targetId: 'stay-1', targetKind: 'stay' })
  ).resolves.toMatchObject({ amount: 240, currency: 'EUR', targetId: 'stay-1' });
  expect(mutations).toEqual([
    {
      amount: 240,
      split: 'total',
      target: { id: 'stay-1', type: 'stay' },
      tripId: 'trip-1'
    }
  ]);
});
