import { expect, test, vi } from 'vitest';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import {
  createApplyTripVersionTool,
  createApproveTripVersionTool,
  createSetTravelerRsvpTool
} from '#backend/assistant/tools/trips/workflow';

test('applies an approved idea through the merge action', async () => {
  const actions: unknown[] = [];
  const tool = createApplyTripVersionTool() as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runAction: async (_reference: unknown, args: unknown) => {
      actions.push(args);
      return 'applied';
    }
  };

  await expect(tool.execute(context, { proposalId: 'proposal-1' })).resolves.toEqual({
    proposalId: 'proposal-1',
    status: 'applied'
  });
  expect(actions).toEqual([{ proposalId: 'proposal-1' }]);
});

test('reports conflicted when Git cannot auto-merge the idea', async () => {
  const tool = createApplyTripVersionTool() as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runAction: async () => 'conflicted'
  };

  await expect(tool.execute(context, { proposalId: 'proposal-1' })).resolves.toEqual({
    proposalId: 'proposal-1',
    status: 'conflicted'
  });
});

test('records idea approval for the current traveler', async () => {
  const mutations: unknown[] = [];
  const tool = createApproveTripVersionTool() as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return null;
    }
  };

  await expect(
    tool.execute(context, { approved: true, proposalId: 'proposal-1' })
  ).resolves.toEqual({
    approved: true,
    proposalId: 'proposal-1'
  });
  expect(mutations).toEqual([{ approved: true, proposalId: 'proposal-1' }]);
});

test('sets the current traveler RSVP on the shared trip', async () => {
  const mutations: unknown[] = [];
  const tool = createSetTravelerRsvpTool('shared-trip' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const context = {
    runMutation: async (_reference: unknown, args: unknown) => {
      mutations.push(args);
      return null;
    }
  };

  await expect(tool.execute(context, { status: 'going' })).resolves.toEqual({
    status: 'going',
    tripId: 'shared-trip',
    userId: null
  });
  expect(mutations).toEqual([{ status: 'going', tripId: 'shared-trip' }]);
});
