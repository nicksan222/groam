import { mockModel } from '@convex-dev/agent';
import { expectConsole } from '@groam/vitest-config/console';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { setupTrip } from '#testing/trips';
import { draftChangedVersion } from '#testing/versions';

afterEach(() => vi.restoreAllMocks());

const review = {
  comments: [{ body: 'Add a rest day after the flight.', kind: 'comment' }],
  summary: 'Looks workable with one suggestion.',
  verdict: 'comment'
};

/** A submitted idea whose automatic review already finished, so a manual review runs inline. */
async function submittedIdea() {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  const autoRunId = await owner.client.run(async (ctx) => {
    const auto = (await ctx.db.query('agentRuns').collect()).find(
      (run) => run.proposalId === version.proposalId
    );
    if (!auto) throw new Error('Expected the automatic review run');
    await ctx.db.patch('agentRuns', auto._id, { completedAt: Date.now(), status: 'complete' });
    return auto._id;
  });
  const manualRun = () =>
    owner.client.run(async (ctx) =>
      (await ctx.db.query('agentRuns').collect()).find(
        (run) => run.proposalId === version.proposalId && run._id !== autoRunId
      )
    );
  const runReview = () =>
    owner.client.action(internal.modules.travel.versions.agent.review.action.run, {
      proposalId: version.proposalId
    });
  return { manualRun, owner, proposalId: version.proposalId, runReview };
}

test('a manual review stores the reviewer output and reports it', { timeout: 15_000 }, async () => {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: mockModel({ content: [{ text: JSON.stringify(review), type: 'text' }] }),
    modelId: 'test-model'
  } as never);
  const idea = await submittedIdea();
  await expect(idea.runReview()).resolves.toEqual({
    commentCount: 1,
    summary: 'Looks workable with one suggestion.'
  });
  expect(await idea.manualRun()).toMatchObject({
    report: 'Looks workable with one suggestion.',
    status: 'complete'
  });
});

test('a review stopped while the model answers stores nothing', { timeout: 15_000 }, async () => {
  const idea = await submittedIdea();
  vi.spyOn(AssistantProvider, 'configured').mockImplementation(async () => {
    const run = await idea.manualRun();
    await idea.owner.client.mutation(api.routes.agents.runs.stop.run, {
      runId: run?._id as Id<'agentRuns'>
    });
    return {
      languageModel: mockModel({ content: [{ text: JSON.stringify(review), type: 'text' }] }),
      modelId: 'test-model'
    } as never;
  });
  // A stopped review is not a failure: no "standalone agent run failed" log.
  await expect(idea.runReview()).rejects.toThrow('The idea review did not complete.');
  const stopped = await idea.manualRun();
  expect(stopped?.status).toBe('aborted');
  expect(stopped?.report).toBeUndefined();
});

test('a reviewer that returns no review fails the run', { timeout: 15_000 }, async () => {
  expectConsole('error', 'standalone agent run failed');
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: mockModel({ content: [{ text: 'null', type: 'text' }] }),
    modelId: 'test-model'
  } as never);
  const idea = await submittedIdea();
  await expect(idea.runReview()).rejects.toThrow();
  expect((await idea.manualRun())?.status).toBe('failed');
});
