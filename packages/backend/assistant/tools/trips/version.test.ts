import { expect, test, vi } from 'vite-plus/test';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import { createStartTripVersionTool } from '#backend/assistant/tools/trips/version';

test('starts a protected proposed trip for agent changes', async () => {
  const mutations: unknown[] = [];
  const tool = createStartTripVersionTool('shared-trip' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return {
        ideaName: 'brave-otter',
        proposalId: 'proposal-1',
        workingTripId: 'working-trip'
      };
    }
  };

  await expect(tool.execute(context, {})).resolves.toMatchObject({
    ideaName: 'brave-otter',
    proposalId: 'proposal-1',
    status: 'draft',
    workingTripId: 'working-trip'
  });
  expect(mutations).toEqual([{ tripId: 'shared-trip' }]);
});

test('links the assigned issue and agent run when starting an idea', async () => {
  const mutations: unknown[] = [];
  const tool = createStartTripVersionTool('shared-trip' as never, {
    issueId: 'issue-1' as never,
    runId: 'run-1' as never
  }) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return {
        ideaName: 'sporting-wallaby',
        proposalId: 'proposal-1',
        workingTripId: 'working-trip'
      };
    }
  };

  await expect(tool.execute(context, {})).resolves.toMatchObject({
    ideaName: 'sporting-wallaby',
    proposalId: 'proposal-1',
    status: 'draft',
    workingTripId: 'working-trip'
  });
  expect(mutations).toEqual([{ issueId: 'issue-1', runId: 'run-1', tripId: 'shared-trip' }]);
});

test('reuses the started idea for the same trip and starts one for another trip', async () => {
  const mutations: unknown[] = [];
  const tool = createStartTripVersionTool('shared-trip' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return { ideaName: 'idea', proposalId: 'proposal', workingTripId: 'working-trip' };
    }
  };

  await tool.execute(context, {});
  await tool.execute(context, { tripId: 'shared-trip' });
  expect(mutations).toHaveLength(1);
  await tool.execute(context, { tripId: 'other-trip' });
  expect(mutations).toEqual([{ tripId: 'shared-trip' }, { tripId: 'other-trip' }]);
});
