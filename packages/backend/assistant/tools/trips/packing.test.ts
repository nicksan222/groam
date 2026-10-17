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
    runQuery: async () => [{ id: 'item-1', label: 'Passport', packed: false }]
  };

  await expect(tool.execute(context, {})).resolves.toEqual({
    items: [{ id: 'item-1', label: 'Passport', packed: false }],
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
      return { id: 'item-1', label: 'Sunscreen', packed: false };
    }
  };

  await expect(
    tool.execute(context, { action: 'add', label: 'Sunscreen', tripId: 'working-idea' })
  ).resolves.toEqual({
    action: 'add',
    item: { id: 'item-1', label: 'Sunscreen', packed: false },
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
    tool.execute(context, { action: 'update', itemId: 'item-1', packed: true, tripId: 'idea' })
  ).rejects.toThrow('Only a draft idea can be written to');
  expect(mutations).toEqual([]);
});
