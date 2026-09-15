import { expect, test, vi } from 'vitest';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import {
  createRemoveTransferTool,
  createSetTransferTool
} from '#backend/assistant/tools/trips/transfers';

const draft = {
  canEdit: true,
  proposalStatus: 'draft',
  destinations: [{ endDay: 3, id: 'destination-1', name: 'Lisbon', startDay: 1 }]
};

test('sets arrival travel on a mocked draft idea', async () => {
  const mutations: unknown[] = [];
  const tool = createSetTransferTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return 'transfer-1';
    },
    runQuery: async () => draft
  };

  await expect(
    tool.execute(context, { kind: 'arrival', mode: 'flight', notes: 'Land at 09:20' })
  ).resolves.toMatchObject({
    kind: 'arrival',
    mode: 'flight',
    transferId: 'transfer-1'
  });
  expect(mutations).toEqual([
    {
      input: { mode: 'flight', notes: 'Land at 09:20' },
      target: { kind: 'arrival' },
      tripId: 'trip-1'
    }
  ]);
});

test('removes arrival travel on a mocked draft idea', async () => {
  const mutations: unknown[] = [];
  const tool = createRemoveTransferTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return null;
    },
    runQuery: async () => draft
  };

  await expect(
    tool.execute(context, { kind: 'arrival', transferId: 'transfer-1' })
  ).resolves.toMatchObject({
    kind: 'arrival',
    removed: true,
    transferId: 'transfer-1'
  });
  expect(mutations).toEqual([
    { target: { kind: 'arrival', transferId: 'transfer-1' }, tripId: 'trip-1' }
  ]);
});
