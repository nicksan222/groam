import { expect, test, vi } from 'vitest';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import {
  createAddActivityTool,
  createRemoveActivityTool,
  createUpdateActivityTool
} from '#backend/assistant/tools/trips/activity';

test('adds an activity with a mocked trip context and mutation', async () => {
  const mutations: unknown[] = [];
  const tool = createAddActivityTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return 'activity-1';
    },
    runQuery: async () => ({
      canEdit: true,
      proposalStatus: 'draft',
      destinations: [{ endDay: 3, id: 'destination-1', name: 'Lisbon', startDay: 1 }]
    })
  };

  await expect(
    tool.execute(context, {
      day: 2,
      destinationId: 'destination-1',
      timeBlock: 'morning',
      title: 'Food tour'
    })
  ).resolves.toMatchObject({ activityId: 'activity-1', title: 'Food tour' });
  expect(mutations).toEqual([
    {
      destinationId: 'destination-1',
      input: { schedule: { day: 2, timeBlock: 'morning' }, title: 'Food tour' },
      tripId: 'trip-1'
    }
  ]);
});

test('adds more than one activity in the same tool instance', async () => {
  const mutations: unknown[] = [];
  const tool = createAddActivityTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return `activity-${mutations.length}`;
    },
    runQuery: async () => ({
      canEdit: true,
      proposalStatus: 'draft',
      destinations: [{ endDay: 3, id: 'destination-1', name: 'Lisbon', startDay: 1 }]
    })
  };

  await expect(
    tool.execute(context, {
      day: 2,
      destinationId: 'destination-1',
      timeBlock: 'morning',
      title: 'Food tour'
    })
  ).resolves.toMatchObject({ activityId: 'activity-1', title: 'Food tour' });
  await expect(
    tool.execute(context, {
      day: 3,
      destinationId: 'destination-1',
      timeBlock: 'afternoon',
      title: 'Sunset walk'
    })
  ).resolves.toMatchObject({ activityId: 'activity-2', title: 'Sunset walk' });
  expect(mutations).toHaveLength(2);
});

const draftWithActivity = {
  canEdit: true,
  proposalStatus: 'draft',
  destinations: [
    {
      activities: [{ id: 'activity-1', title: 'Food tour' }],
      endDay: 3,
      id: 'destination-1',
      name: 'Lisbon',
      startDay: 1,
      stays: []
    }
  ]
};

test('updates an existing activity on a mocked draft idea', async () => {
  const mutations: unknown[] = [];
  const tool = createUpdateActivityTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return null;
    },
    runQuery: async () => draftWithActivity
  };

  await expect(
    tool.execute(context, { activityId: 'activity-1', title: 'Night market' })
  ).resolves.toMatchObject({ activityId: 'activity-1', title: 'Night market' });
  expect(mutations).toEqual([
    { activityId: 'activity-1', patch: { title: 'Night market' }, tripId: 'trip-1' }
  ]);
});

test('removes an existing activity on a mocked draft idea', async () => {
  const mutations: unknown[] = [];
  const tool = createRemoveActivityTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return null;
    },
    runQuery: async () => draftWithActivity
  };

  await expect(tool.execute(context, { activityId: 'activity-1' })).resolves.toMatchObject({
    activityId: 'activity-1',
    removed: true
  });
  expect(mutations).toEqual([{ activityId: 'activity-1', tripId: 'trip-1' }]);
});
