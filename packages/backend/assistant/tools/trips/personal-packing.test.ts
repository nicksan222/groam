import { expect, test, vi } from 'vite-plus/test';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import {
  createListPersonalPackingTool,
  createManagePersonalPackingTool
} from '#backend/assistant/tools/trips/personal-packing';

type Tool = { execute: (ctx: unknown, input: unknown) => Promise<unknown>; inputSchema: unknown };

test('personal tools take no user id and never need an idea', async () => {
  const calls: unknown[] = [];
  const context = {
    runMutation: async (_ref: unknown, args: unknown) => {
      calls.push(args);
      return { id: 'p1', label: 'Socks', packed: true };
    },
    runQuery: async (_ref: unknown, args: unknown) => {
      calls.push(args);
      return [];
    }
  };
  const read = createListPersonalPackingTool('shared-trip' as never) as unknown as Tool;
  const manage = createManagePersonalPackingTool('shared-trip' as never) as unknown as Tool;
  await read.execute(context, {});
  await manage.execute(context, { action: 'add', label: 'Socks' });
  await manage.execute(context, { action: 'tick', itemId: 'p1' });
  await manage.execute(context, { action: 'untick', itemId: 'p1' });
  await manage.execute(context, { action: 'rename', itemId: 'p1', label: 'Wool socks' });
  await manage.execute(context, { action: 'remove', itemId: 'p1' });
  expect(calls).toEqual([
    { tripId: 'shared-trip' },
    { label: 'Socks', tripId: 'shared-trip' },
    { itemId: 'p1', packed: true, tripId: 'shared-trip' },
    { itemId: 'p1', packed: false, tripId: 'shared-trip' },
    { itemId: 'p1', label: 'Wool socks', tripId: 'shared-trip' },
    { itemId: 'p1', tripId: 'shared-trip' }
  ]);
  // Not even a stray userId argument can be forwarded.
  await manage.execute(context, { action: 'add', label: 'Hat', userId: 'someone-else' });
  expect(calls.at(-1)).toEqual({ label: 'Hat', tripId: 'shared-trip' });
});
