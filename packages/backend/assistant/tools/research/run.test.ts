import { expect, test, vi } from 'vite-plus/test';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import { createResearchTopicTool } from './run';

test('delegates a topic and effort and returns the researcher report to its caller', async () => {
  const calls: unknown[] = [];
  const report = {
    runId: 'run-1',
    report: 'Compare the train options.',
    sources: [{ url: 'https://rail.example', title: 'Rail operator' }],
    effort: 'deep',
    incomplete: false
  };
  const tool = createResearchTopicTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const ctx = {
    runAction: async (_ref: unknown, args: unknown) => {
      calls.push(args);
      return report;
    }
  };
  await expect(
    tool.execute(ctx, { topic: 'Train versus driving', effort: 'deep' })
  ).resolves.toEqual(report);
  expect(calls).toEqual([{ tripId: 'trip-1', topic: 'Train versus driving', effort: 'deep' }]);
});

test('requires a trip when the calling screen has none', () => {
  const tool = createResearchTopicTool(null) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  expect(() => tool.execute({}, { topic: 'Hotels', effort: 'quick' })).toThrow(
    'Find or attach a trip'
  );
});

test('bounds research delegation even for a private chat without a parent run', async () => {
  const tool = createResearchTopicTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  const runAction = vi.fn().mockResolvedValue({ report: 'Evidence' });
  const input = { topic: 'Hotel options', effort: 'quick' };
  await tool.execute({ runAction }, input);
  await tool.execute({ runAction }, input);
  await tool.execute({ runAction }, input);
  expect(() => tool.execute({ runAction }, input)).toThrow('delegation budget reached');
  expect(runAction).toHaveBeenCalledTimes(3);
});
