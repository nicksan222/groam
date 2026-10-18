import { mockModel } from '@convex-dev/agent';
import { expectConsole } from '@groam/vitest-config/console';
import { expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { setupTrip } from '#testing/trips';
import { draftChangedVersion } from '#testing/versions';

test('throws the stored run error when the idea review fails', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  // Submitting started the automatic review's workflow; finish it so the manual one runs inline.
  const autoRunId = await owner.client.run(async (ctx) => {
    const auto = (await ctx.db.query('agentRuns').collect()).find(
      (run) => run.proposalId === version.proposalId
    );
    if (!auto?.workflowId) throw new Error('Expected the automatic review workflow');
    await ctx.db.patch('agentRuns', auto._id, { completedAt: Date.now(), status: 'complete' });
    return auto._id;
  });
  expectConsole('error', 'standalone agent run failed');
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: mockModel({ content: [] }),
    modelId: 'test-model'
  } as never);

  const error = await owner.client
    .action(internal.modules.travel.versions.agent.review.action.run, {
      proposalId: version.proposalId
    })
    .then(
      () => null,
      (caught: unknown) => caught
    );
  expect(error).toBeInstanceOf(Error);

  await owner.client.run(async (ctx) => {
    const runs = await ctx.db.query('agentRuns').collect();
    const failed = runs.find(
      (run) => run.proposalId === version.proposalId && run._id !== autoRunId
    );
    expect(failed?.status).toBe('failed');
    expect(failed?.error).toBeTruthy();
    expect(String(error)).toContain(failed?.error);
  });
  vi.restoreAllMocks();
});

test('manual review during a running review returns instead of throwing', async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  const runId = await owner.client.run(async (ctx) =>
    ctx.db.insert('agentRuns', {
      shortId: 'autorev1',
      agentId: 'reviewer',
      createdBy: { name: 'Owner', userId: owner.userId },
      kickoff: 'assign',
      organizationId: owner.organizationId as string,
      proposalId: version.proposalId,
      startedAt: Date.now(),
      status: 'running',
      surface: 'standalone',
      title: 'Auto review',
      tripId,
      updatedAt: Date.now()
    })
  );
  await expect(
    owner.client.action(internal.modules.travel.versions.agent.review.action.run, {
      proposalId: version.proposalId
    })
  ).resolves.toEqual({
    commentCount: 0,
    inProgress: true,
    summary: 'A review of this idea is in progress.'
  });
  await owner.client.run(async (ctx) => {
    expect((await ctx.db.get('agentRuns', runId))?.status).toBe('running');
  });
});

test('manual review while the automatic review is queued leaves it to its workflow', async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  const model = vi.spyOn(AssistantProvider, 'configured');
  await expect(
    owner.client.action(internal.modules.travel.versions.agent.review.action.run, {
      proposalId: version.proposalId
    })
  ).resolves.toEqual({
    commentCount: 0,
    inProgress: true,
    summary: 'A review of this idea is in progress.'
  });
  expect(model).not.toHaveBeenCalled();
  await owner.client.run(async (ctx) => {
    const runs = (await ctx.db.query('agentRuns').collect()).filter(
      (run) => run.proposalId === version.proposalId
    );
    expect(runs).toEqual([
      expect.objectContaining({ status: 'queued', workflowId: expect.any(String) })
    ]);
  });
  vi.restoreAllMocks();
});
