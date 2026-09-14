import { expect, test, vi } from 'vitest';

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
