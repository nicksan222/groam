import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { setupTrip } from '#testing/trips';

const issueAgent = { agentId: 'issue' as const, kind: 'agent' as const, name: 'Issue agent' };

async function finishedIssueRun() {
  const trip = await setupTrip(0);
  const issueId = await trip.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Find a rainy-day museum.',
    title: 'Rainy day',
    tripId: trip.tripId
  });
  const runId = await trip.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected a queued run');
  await trip.owner.test.run((ctx) =>
    AgentRuns.finish(ctx, { error: 'The model timed out', runId, status: 'failed' })
  );
  return { ...trip, issueId, runId };
}

test('only Issue agent runs can be re-run', { timeout: 15_000 }, async () => {
  const trip = await setupTrip(0);
  const runId = await trip.owner.test.run((ctx) =>
    ctx.db.insert('agentRuns', {
      agentId: 'groam',
      createdBy: { name: 'Owner', userId: trip.owner.userId },
      kickoff: 'assign',
      organizationId: trip.owner.organizationId as string,
      shortId: 'chatrun1',
      status: 'complete',
      surface: 'chat',
      title: 'Chat turn',
      updatedAt: Date.now()
    })
  );
  await expect(
    trip.owner.client.mutation(api.routes.agents.runs.retry.run, { runId })
  ).rejects.toThrow('Only Issue agent runs can be re-run');
});

test('an unassigned issue must be re-assigned before re-running', { timeout: 15_000 }, async () => {
  const { issueId, owner, runId } = await finishedIssueRun();
  await owner.client.mutation(api.routes.trips.issues.assign.run, { assignee: null, issueId });
  await expect(owner.client.mutation(api.routes.agents.runs.retry.run, { runId })).rejects.toThrow(
    'Re-assign the Issue agent before re-running'
  );
});

test('a resolved issue cannot be re-run', { timeout: 15_000 }, async () => {
  const { issueId, owner, runId } = await finishedIssueRun();
  await owner.client.mutation(api.routes.trips.issues.status.run, { issueId, status: 'closed' });
  await expect(owner.client.mutation(api.routes.agents.runs.retry.run, { runId })).rejects.toThrow(
    'Resolved issues cannot be re-run'
  );
});
