import { expect, test, vi } from 'vite-plus/test';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import {
  createListPackingTool,
  createManagePackingTool
} from '#backend/assistant/tools/trips/packing';

test('lists packing items for the active trip', async () => {
  const tool = createListPackingTool('shared-trip' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runQuery: async () => []
  };

  await expect(tool.execute(context, {})).resolves.toEqual({
    items: [],
    travelers: [],
    tripId: 'shared-trip'
  });
});

test('adds a packing item to the explicitly selected working idea', async () => {
  const mutations: unknown[] = [];
  const tool = createManagePackingTool('shared-trip' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runQuery: async () => ({ canEdit: true, proposalStatus: 'draft' }),
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return { id: 'item-1', label: 'Sunscreen', quantity: 1 };
    }
  };

  await expect(
    tool.execute(context, { action: 'add', label: 'Sunscreen', tripId: 'working-idea' })
  ).resolves.toEqual({
    action: 'add',
    item: { id: 'item-1', label: 'Sunscreen', quantity: 1 },
    tripId: 'working-idea'
  });
  expect(mutations).toEqual([{ label: 'Sunscreen', tripId: 'working-idea' }]);
});

test('refuses packing edits on an idea that is in review', async () => {
  const mutations: unknown[] = [];
  const tool = createManagePackingTool('shared-trip' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runQuery: async () => ({ canEdit: true, proposalStatus: 'in_review' }),
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
    }
  };

  await expect(
    tool.execute(context, { action: 'update', itemId: 'item-1', quantity: 3, tripId: 'idea' })
  ).rejects.toThrow('Only a draft idea can be written to');
  expect(mutations).toEqual([]);
});

test('adds with a quantity and assigns a traveler', async () => {
  const mutations: unknown[] = [];
  const tool = createManagePackingTool('shared-trip' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return null;
    },
    runQuery: async () => ({ canEdit: true, proposalStatus: 'draft' })
  };
  await expect(
    tool.execute(context, {
      action: 'bring',
      count: 2,
      itemId: 'item-1',
      tripId: 'working-idea',
      userId: 'user-1'
    })
  ).resolves.toEqual({
    action: 'bring',
    count: 2,
    itemId: 'item-1',
    tripId: 'working-idea',
    userId: 'user-1'
  });
  await tool.execute(context, {
    action: 'add',
    label: 'Tent',
    quantity: 4,
    tripId: 'working-idea'
  });
  expect(mutations).toEqual([
    { count: 2, itemId: 'item-1', tripId: 'working-idea', userId: 'user-1' },
    { label: 'Tent', quantity: 4, tripId: 'working-idea' }
  ]);
  await expect(
    tool.execute(context, { action: 'bring', itemId: 'item-1', tripId: 'working-idea' })
  ).rejects.toThrow('Provide the traveler id');
});

test('lists coverage and the trip travelers so anyone can be assigned', async () => {
  const tool = createListPackingTool('shared-trip' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  let call = 0;
  const context = {
    runQuery: async () =>
      call++ === 0
        ? [
            { bringers: [], brought: 1, id: 'a', label: 'Tent', quantity: 2 },
            { bringers: [], brought: 3, id: 'b', label: 'Hat', quantity: 2 }
          ]
        : [{ name: 'Ana', status: 'going', userId: 'u1' }]
  };
  await expect(tool.execute(context, {})).resolves.toMatchObject({
    items: [{ coverage: 'needs 1 more' }, { coverage: 'covered' }],
    travelers: [{ name: 'Ana', userId: 'u1' }]
  });
});
