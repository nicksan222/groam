import { expect, test, vi } from 'vitest';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import { createSetTripDatesTool } from '#backend/assistant/tools/trips/dates';

test('sets dates once with a mocked mutation', async () => {
  const mutations: unknown[] = [];
  const tool = createSetTripDatesTool('working-trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
    }
  };
  const input = { endDate: '2027-01-10', startDate: '2027-01-01' };

  await expect(tool.execute(context, input)).resolves.toMatchObject({
    endDate: '2027-01-10',
    startDate: '2027-01-01',
    status: 'saved'
  });
  await tool.execute(context, input);
  expect(mutations).toEqual([
    {
      endDate: '2027-01-10',
      startDate: '2027-01-01',
      tripId: 'working-trip-1'
    }
  ]);
});
