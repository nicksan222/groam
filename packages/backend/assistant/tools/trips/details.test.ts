import { expect, test, vi } from 'vitest';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import { createUpdateTripDetailsTool } from '#backend/assistant/tools/trips/details';

test('updates trip details on a mocked draft idea', async () => {
  const mutations: unknown[] = [];
  const tool = createUpdateTripDetailsTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return null;
    },
    runQuery: async () => ({
      canEdit: true,
      dateNotes: null,
      initialBudget: 2000,
      proposalStatus: 'draft',
      totalDurationDays: 6,
      tripName: 'Lisbon'
    })
  };

  await expect(tool.execute(context, { name: 'Lisbon extra day', totalDays: 7 })).resolves.toEqual({
    budgetAmount: 2000,
    dateNotes: null,
    name: 'Lisbon extra day',
    totalDays: 7
  });
  expect(mutations).toEqual([{ name: 'Lisbon extra day', totalDays: 7, tripId: 'trip-1' }]);
});
