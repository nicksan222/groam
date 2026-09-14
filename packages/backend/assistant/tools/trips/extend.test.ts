import { expect, test, vi } from 'vitest';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import { createExtendItineraryTool } from '#backend/assistant/tools/trips/extend';

test('extends a stop on a mocked draft idea', async () => {
  const mutations: unknown[] = [];
  const tool = createExtendItineraryTool('working-trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return { endDay: 7, extraDays: 1, startDay: 1, totalDurationDays: 7 };
    },
    runQuery: async () => ({
      canEdit: true,
      proposalStatus: 'draft',
      destinations: [{ endDay: 6, id: 'destination-1', name: 'Chiang Mai', startDay: 1 }]
    })
  };

  await expect(
    tool.execute(context, { destinationId: 'destination-1', extraDays: 1 })
  ).resolves.toMatchObject({
    destinationId: 'destination-1',
    endDay: 7,
    extraDays: 1,
    startDay: 1,
    totalDurationDays: 7
  });
  expect(mutations).toEqual([
    { destinationId: 'destination-1', extraDays: 1, tripId: 'working-trip-1' }
  ]);
});
