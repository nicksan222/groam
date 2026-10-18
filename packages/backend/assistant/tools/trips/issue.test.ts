import { expect, test, vi } from 'vite-plus/test';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import { createTripIssueTool } from '#backend/assistant/tools/trips/issue';

test('creates a new issue per distinct input and dedupes identical repeats', async () => {
  const mutations: unknown[] = [];
  const tool = createTripIssueTool('shared-trip' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return `issue-${mutations.length}`;
    }
  };

  const visas = { body: 'Check entry rules', title: 'Visas' };
  await expect(tool.execute(context, visas)).resolves.toMatchObject({ issueId: 'issue-1' });
  await expect(tool.execute(context, visas)).resolves.toMatchObject({ issueId: 'issue-1' });
  await expect(
    tool.execute(context, { body: 'Compare plans', title: 'Insurance' })
  ).resolves.toMatchObject({ issueId: 'issue-2', status: 'open' });
  expect(mutations).toHaveLength(2);
});
