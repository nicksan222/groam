import { mockModel } from '@convex-dev/agent';
import { expectConsole } from '@groam/vitest-config/console';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { setupTrip } from '#testing/trips';

const issueAgent = { agentId: 'issue' as const, kind: 'agent' as const, name: 'Issue agent' };

afterEach(() => {
  vi.restoreAllMocks();
});

/** Replace only the provider response; the real Agent loop and run tracking still execute. */
function useModel(model: ReturnType<typeof mockModel>) {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: model,
    modelId: 'test-model'
  } as never);
}

async function queuedIssueRun() {
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Pick a rainy-day option.',
    title: 'Rainy-day option',
    tripId
  });
  const runId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected a queued run');
  return { owner, runId };
}

test('fails an issue run when the model returns nothing', { timeout: 15_000 }, async () => {
  const { owner, runId } = await queuedIssueRun();
  useModel(mockModel({ content: [] }));
  expectConsole('error', 'standalone agent run failed');

  await owner.client.action(api.routes.agents.runs.start.run, { runId });

  await owner.client.run(async (ctx) => {
    const run = await ctx.db.get('agentRuns', runId);
    expect(run?.status).toBe('failed');
    expect(run?.error).toContain('The agent returned nothing');
  });
});

test('completes an issue run with the model reply as its report', { timeout: 15_000 }, async () => {
  const { owner, runId } = await queuedIssueRun();
  useModel(mockModel({ content: [{ text: 'Booked the museum for a rainy day.', type: 'text' }] }));

  await owner.client.action(api.routes.agents.runs.start.run, { runId });

  await owner.client.run(async (ctx) => {
    const run = await ctx.db.get('agentRuns', runId);
    expect(run?.status).toBe('complete');
    expect(run?.report).toBe('Booked the museum for a rainy day.');
  });
});
