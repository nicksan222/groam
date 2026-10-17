import { expect, test, vi } from 'vite-plus/test';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import { createCancelWaitTool, createWaitForTool } from '#backend/assistant/tools/agent/waits';

type Executable = { execute: (ctx: unknown, input: unknown) => Promise<unknown> };

function recorder(result: unknown) {
  const calls: unknown[] = [];
  const ctx = {
    runMutation: async (_reference: unknown, args: unknown) => {
      calls.push(args);
      return result;
    }
  };
  return { calls, ctx };
}

test('waitFor turns hours into an absolute deadline and reports a wait', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));
  try {
    const { calls, ctx } = recorder({ eventId: 'e', status: 'waiting', waitId: 'w' });
    const tool = createWaitForTool(null) as unknown as Executable;
    const output = await tool.execute(ctx, { condition: { kind: 'timer' }, deadlineHours: 2 });
    expect(calls).toEqual([
      { condition: { kind: 'timer' }, deadlineAt: Date.parse('2026-10-17T12:00:00Z') }
    ]);
    expect(output).toEqual({ status: 'waiting', wait: true, waitId: 'w' });
  } finally {
    vi.useRealTimers();
  }
});

test('cancelWait forwards the wait id', async () => {
  const { calls, ctx } = recorder(null);
  const tool = createCancelWaitTool() as unknown as Executable;
  await expect(tool.execute(ctx, { waitId: 'w' })).resolves.toEqual({
    cancelled: true,
    waitId: 'w'
  });
  expect(calls).toEqual([{ waitId: 'w' }]);
});

test('waitFor maps issue, idea, and RSVP conditions onto the active trip', async () => {
  const { calls, ctx } = recorder({ eventId: 'e', status: 'waiting', waitId: 'w' });
  const tool = createWaitForTool('trip-1' as never) as unknown as Executable;
  await tool.execute(ctx, { condition: { issueId: 'i1', kind: 'issue' }, deadlineHours: 1 });
  await tool.execute(ctx, {
    condition: { kind: 'proposal', proposalId: 'p1', until: 'decided' },
    deadlineHours: 1
  });
  await tool.execute(ctx, { condition: { kind: 'rsvp', rule: { going: 4 } }, deadlineHours: 1 });
  await tool.execute(ctx, {
    condition: { kind: 'poll', pollId: 'q1', rule: [{ kind: 'closed' }] },
    deadlineHours: 1
  });
  expect(calls.map((call) => (call as { condition: unknown }).condition)).toEqual([
    { issueId: 'i1', kind: 'issue', until: 'resolved' },
    { kind: 'proposal', proposalId: 'p1', until: 'decided' },
    { kind: 'rsvp', rule: { going: 4 }, tripId: 'trip-1' },
    { kind: 'poll', pollId: 'q1', rule: [{ kind: 'closed' }] }
  ]);
});

test('an RSVP wait without an active trip is refused before calling Convex', async () => {
  const { calls, ctx } = recorder(null);
  const tool = createWaitForTool(null) as unknown as Executable;
  await expect(
    tool.execute(ctx, { condition: { kind: 'rsvp', rule: { going: 2 } }, deadlineHours: 1 })
  ).rejects.toThrow('Open a trip');
  expect(calls).toEqual([]);
});
