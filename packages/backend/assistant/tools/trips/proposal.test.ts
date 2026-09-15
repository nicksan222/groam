import { expect, test, vi } from 'vitest';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import { createTripProposalTool } from '#backend/assistant/tools/trips/proposal';

test('creates and attaches a proposed trip with mocked Convex calls', async () => {
  const mutations: unknown[] = [];
  const tool = createTripProposalTool('thread-1', 'private') as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return mutations.length === 1 ? 'trip-1' : null;
    },
    runQuery: async () => ({ tags: [] })
  };

  await expect(
    tool.execute(context, { destination: 'Lisbon', name: 'Portugal' })
  ).resolves.toMatchObject({
    name: 'Portugal',
    tripId: 'trip-1'
  });
  expect(mutations).toHaveLength(2);
  expect(mutations[1]).toEqual({
    scope: 'private',
    tags: [{ id: 'trip-1', kind: 'trip' }],
    threadId: 'thread-1'
  });
});
