import { expect, test, vi } from 'vite-plus/test';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import { createPollTool } from '#backend/assistant/tools/agent/polls';

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

test('createPoll attaches the active trip and turns waitFor hours into a deadline', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));
  try {
    const { calls, ctx } = recorder({ pollId: 'p', waitId: 'w' });
    const tool = createPollTool('trip-1' as never) as unknown as Executable;
    const output = await tool.execute(ctx, {
      multiSelect: false,
      options: ['Sushi', 'Tapas'],
      question: 'Dinner Friday?',
      waitFor: { deadlineHours: 24, rule: [{ kind: 'optionVotes', majority: true }] }
    });
    expect(calls).toEqual([
      {
        activeTripId: 'trip-1',
        multiSelect: false,
        options: ['Sushi', 'Tapas'],
        question: 'Dinner Friday?',
        waitFor: {
          deadlineAt: Date.parse('2026-10-18T10:00:00Z'),
          rule: [{ kind: 'optionVotes', majority: true }]
        }
      }
    ]);
    expect(output).toEqual({ pollId: 'p', wait: true, waitId: 'w' });
  } finally {
    vi.useRealTimers();
  }
});

test('createPoll without waitFor does not suspend the run', async () => {
  const { calls, ctx } = recorder({ pollId: 'p', waitId: null });
  const tool = createPollTool(null) as unknown as Executable;
  const output = await tool.execute(ctx, {
    multiSelect: true,
    options: ['A', 'B'],
    question: 'Which?'
  });
  expect(calls).toEqual([{ multiSelect: true, options: ['A', 'B'], question: 'Which?' }]);
  expect(output).toEqual({ pollId: 'p', wait: false, waitId: null });
});
