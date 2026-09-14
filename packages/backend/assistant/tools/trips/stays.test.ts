import { expect, test, vi } from 'vitest';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import {
  createAddStayTool,
  createRemoveStayTool,
  createUpdateStayTool
} from '#backend/assistant/tools/trips/stays';

test('adds a stay with mocked trip reads and writes', async () => {
  const mutations: unknown[] = [];
  const tool = createAddStayTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return 'stay-1';
    },
    runQuery: async () => ({
      canEdit: true,
      proposalStatus: 'draft',
      destinations: [{ endDay: 4, id: 'destination-1', name: 'Lisbon', startDay: 1 }]
    })
  };

  await expect(
    tool.execute(context, {
      checkInDay: 1,
      checkOutDay: 3,
      destinationId: 'destination-1',
      title: 'Hotel Tejo'
    })
  ).resolves.toMatchObject({ stayId: 'stay-1', title: 'Hotel Tejo' });
  expect(mutations).toEqual([
    {
      destinationId: 'destination-1',
      input: { schedule: { checkInDay: 1, checkOutDay: 3 }, title: 'Hotel Tejo' },
      tripId: 'trip-1'
    }
  ]);
});

const draftWithStay = {
  canEdit: true,
  proposalStatus: 'draft',
  destinations: [
    {
      activities: [],
      endDay: 4,
      id: 'destination-1',
      name: 'Lisbon',
      startDay: 1,
      stays: [{ checkInDay: 1, checkOutDay: 3, id: 'stay-1', title: 'Hotel Tejo' }]
    }
  ]
};

test('updates an existing stay on a mocked draft idea', async () => {
  const mutations: unknown[] = [];
  const tool = createUpdateStayTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return null;
    },
    runQuery: async () => draftWithStay
  };

  await expect(
    tool.execute(context, { stayId: 'stay-1', title: 'Riverside Hotel' })
  ).resolves.toMatchObject({ stayId: 'stay-1', title: 'Riverside Hotel' });
  expect(mutations).toEqual([
    { patch: { title: 'Riverside Hotel' }, stayId: 'stay-1', tripId: 'trip-1' }
  ]);
});

test('removes an existing stay on a mocked draft idea', async () => {
  const mutations: unknown[] = [];
  const tool = createRemoveStayTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return null;
    },
    runQuery: async () => draftWithStay
  };

  await expect(tool.execute(context, { stayId: 'stay-1' })).resolves.toMatchObject({
    removed: true,
    stayId: 'stay-1'
  });
  expect(mutations).toEqual([{ stayId: 'stay-1', tripId: 'trip-1' }]);
});
