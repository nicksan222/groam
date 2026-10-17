import { expect, test, vi } from 'vite-plus/test';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import {
  createWaitForTool,
  deadlineHoursField,
  pollRuleInputSchema,
  waitConditionInputSchema
} from '#backend/assistant/tools/agent/waits';

type Schema = { safeParse: (input: unknown) => { success: boolean } };
type Executable = {
  execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  inputSchema: Schema;
};

test.each([
  [{ kind: 'allVoted' }, true],
  [{ count: 2, kind: 'quorum' }, true],
  [{ kind: 'quorum', percent: 50 }, true],
  [{ kind: 'optionVotes', min: 3 }, true],
  [{ kind: 'optionVotes', majority: true }, true],
  [{ kind: 'closed' }, true],
  [{ count: 0, kind: 'quorum' }, false],
  [{ kind: 'quorum', percent: 101 }, false],
  [{ kind: 'optionVotes', majority: false }, false],
  [{ kind: 'unknown' }, false]
])('poll rule %j parses: %s', (rule, valid) => {
  expect(pollRuleInputSchema.safeParse(rule).success).toBe(valid);
});

test.each([
  [{ kind: 'timer' }, true],
  [{ kind: 'poll', pollId: 'p1', rule: [{ kind: 'closed' }] }, true],
  [{ kind: 'poll', pollId: 'p1', rule: [] }, false],
  [{ kind: 'poll', rule: [{ kind: 'closed' }] }, false],
  [{ kind: 'vote' }, false]
])('wait condition %j parses: %s', (condition, valid) => {
  expect(waitConditionInputSchema.safeParse(condition).success).toBe(valid);
});

test.each([
  [0.05, true],
  [336, true],
  [0.01, false],
  [337, false]
])('deadline of %s hours parses: %s', (hours, valid) => {
  expect(deadlineHoursField.safeParse(hours).success).toBe(valid);
});

test('waitFor validates its whole input', () => {
  const tool = createWaitForTool() as unknown as Executable;
  expect(
    tool.inputSchema.safeParse({ condition: { kind: 'timer' }, deadlineHours: 1 }).success
  ).toBe(true);
  expect(tool.inputSchema.safeParse({ condition: { kind: 'timer' } }).success).toBe(false);
});

test('waitFor passes a poll condition through with its rule list', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));
  try {
    const calls: unknown[] = [];
    const ctx = {
      runMutation: async (_reference: unknown, args: unknown) => {
        calls.push(args);
        return { eventId: 'e', status: 'met', waitId: 'w' };
      }
    };
    const tool = createWaitForTool() as unknown as Executable;
    const condition = { kind: 'poll', pollId: 'poll-1', rule: [{ kind: 'allVoted' }] };
    await expect(tool.execute(ctx, { condition, deadlineHours: 0.5 })).resolves.toEqual({
      status: 'met',
      wait: true,
      waitId: 'w'
    });
    expect(calls).toEqual([{ condition, deadlineAt: Date.parse('2026-10-17T10:30:00Z') }]);
  } finally {
    vi.useRealTimers();
  }
});
