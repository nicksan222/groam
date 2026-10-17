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
    const failed = runs.find((run) => run.proposalId === version.proposalId);
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
