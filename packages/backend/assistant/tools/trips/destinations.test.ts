import { expect, test, vi } from 'vitest';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import {
  createAddDestinationTool,
  createRemoveDestinationTool,
  createSetDestinationScheduleTool
} from '#backend/assistant/tools/trips/destinations';

const draft = {
  canEdit: true,
  proposalStatus: 'draft',
  destinations: [{ endDay: 6, id: 'destination-1', name: 'Lisbon', startDay: 1 }]
};

test('adds a verified stop on a mocked draft idea', async () => {
  const mutations: unknown[] = [];
  const tool = createAddDestinationTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return 'destination-2';
    },
    runQuery: async () => draft
  };

  await expect(
    tool.execute(context, {
      endDay: 8,
      latitude: 41.149_61,
      longitude: -8.610_99,
      name: 'Porto, Portugal',
      placeId: 'R:3372207',
      startDay: 7
    })
  ).resolves.toMatchObject({ destinationId: 'destination-2', name: 'Porto, Portugal' });
  expect(mutations).toEqual([
    {
      input: {
        coordinates: { latitude: 41.149_61, longitude: -8.610_99 },
        name: 'Porto, Portugal',
        placeId: 'R:3372207',
        schedule: { endDay: 8, startDay: 7 },
        status: 'known'
      },
      tripId: 'trip-1'
    }
  ]);
});

test('sets a stop schedule on a mocked draft idea', async () => {
  const mutations: unknown[] = [];
  const tool = createSetDestinationScheduleTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return { endDay: 8, startDay: 1, totalDurationDays: 8 };
    },
    runQuery: async () => draft
  };

  await expect(
    tool.execute(context, { destinationId: 'destination-1', endDay: 8, startDay: 1 })
  ).resolves.toMatchObject({
    destinationId: 'destination-1',
    endDay: 8,
    startDay: 1,
    totalDurationDays: 8
  });
  expect(mutations).toEqual([
    { destinationId: 'destination-1', endDay: 8, startDay: 1, tripId: 'trip-1' }
  ]);
});

test('removes a stop on a mocked draft idea', async () => {
  const mutations: unknown[] = [];
  const tool = createRemoveDestinationTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return null;
    },
    runQuery: async () => draft
  };

  await expect(tool.execute(context, { destinationId: 'destination-1' })).resolves.toMatchObject({
    destinationId: 'destination-1',
    removed: true
  });
  expect(mutations).toEqual([{ destinationId: 'destination-1', tripId: 'trip-1' }]);
});
