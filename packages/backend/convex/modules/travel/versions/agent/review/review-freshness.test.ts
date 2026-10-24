import { mockModel } from '@convex-dev/agent';
import { expectConsole } from '@groam/vitest-config/console';
import { expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { pngBlob } from '#testing/media';
import { setupTrip, tripLocationInput } from '#testing/trips';
import { beginAgentReview, changedTripDetails, draftChangedVersion } from '#testing/versions';

const finish = internal.modules.travel.versions.agent.review.index.finish;
const approval = {
  comments: [],
  summary: 'The reviewed plan is sound.',
  verdict: 'approve' as const
};

async function submittedReview() {
  const { owner, tripId } = await setupTrip(0);
  const version = await draftChangedVersion(owner, tripId);
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  const review = await beginAgentReview(owner, version.proposalId);
  return { owner, tripId, version, review };
}

test('an edit during AI review cannot restore approval for the old plan', async () => {
  const { owner, tripId } = await setupTrip(0);
  const version = await draftChangedVersion(owner, tripId);
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  // Leave the manual action as the execution owner without advancing the automatic workflow.
  await owner.client.run(async (ctx) => {
    const runs = await ctx.db.query('agentRuns').collect();
    const automatic = runs.find((run) => run.proposalId === version.proposalId);
    if (!automatic) throw new Error('Expected the automatic review run');
    await ctx.db.patch('agentRuns', automatic._id, { status: 'complete' });
  });

  let started!: () => void;
  const reviewing = new Promise<void>((resolve) => (started = resolve));
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  vi.spyOn(AssistantProvider, 'configured').mockImplementation(async () => {
    started();
    await released;
    return {
      languageModel: mockModel({
        content: [
          {
            text: JSON.stringify({
              comments: [],
              summary: 'The original plan is sound.',
              verdict: 'approve'
            }),
            type: 'text'
          }
        ]
      }),
      modelId: 'test-model'
    } as never;
  });
  expectConsole('error', 'standalone agent run failed');
  const result = owner.client
    .action(internal.modules.travel.versions.agent.review.action.run, {
      proposalId: version.proposalId
    })
    .then(
      () => null,
      (error: unknown) => error
    );
  try {
    await reviewing;
    await owner.client.mutation(api.routes.trips.update.run, {
      input: { ...changedTripDetails, name: 'A different plan after review started' },
      tripId: version.workingTripId
    });
    release();

    expect(String(await result)).toContain('This idea changed during review');
    await expect(
      owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
    ).resolves.toMatchObject({ approvalCount: 0, canMerge: false, groamReview: null });
    await expect(
      owner.client.query(api.routes.trips.versions.feedback.list.run, {
        proposalId: version.proposalId
      })
    ).resolves.toEqual([]);
  } finally {
    release();
    vi.restoreAllMocks();
  }
});

test('automatic cover completion invalidates a review even without a trip timestamp change', async () => {
  const { owner, version } = await submittedReview();
  await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId: version.workingTripId
  });
  const storageId = await owner.client.run(async (ctx) => {
    await ctx.db.patch('trips', version.workingTripId, {
      cover: { generation: 1, status: 'pending' }
    });
    return await ctx.storage.store(pngBlob());
  });
  const review = await beginAgentReview(owner, version.proposalId);
  await expect(
    owner.test.mutation(internal.modules.travel.covers.stock.commit, {
      attribution: {
        license: 'CC0',
        licenseUrl: 'https://example.com/license',
        sourceName: 'Example source',
        sourceUrl: 'https://example.com/cover',
        title: 'A different cover'
      },
      generation: 1,
      storageId,
      tripId: version.workingTripId
    })
  ).resolves.toBe(true);

  await expect(
    owner.client.mutation(finish, { ...approval, ...review, proposalId: version.proposalId })
  ).rejects.toThrow('changed during review');
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ approvalCount: 0, feedbackCount: 0, groamReview: null });
});

test('stopping a review before its result commits prevents all review writes', async () => {
  const { owner, version, review } = await submittedReview();
  await owner.client.mutation(api.routes.agents.runs.stop.run, { runId: review.runId });

  await expect(
    owner.client.mutation(finish, { ...approval, ...review, proposalId: version.proposalId })
  ).rejects.toThrow('Idea review is no longer active');
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ approvalCount: 0, feedbackCount: 0, groamReview: null });
});

test('closing an idea while it is reviewed prevents the review from committing', async () => {
  const { owner, version, review } = await submittedReview();
  await owner.client.mutation(api.routes.trips.versions.close.run, {
    proposalId: version.proposalId,
    reason: 'The group chose another plan.'
  });

  await expect(
    owner.client.mutation(finish, { ...approval, ...review, proposalId: version.proposalId })
  ).rejects.toThrow('only review an open idea');
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    approvalCount: 0,
    feedbackCount: 0,
    groamReview: null,
    status: 'closed'
  });
});

test('rebasing an idea invalidates a review of its previous working copy', async () => {
  const { owner, tripId, version, review } = await submittedReview();
  await owner.client.run(async (ctx) => {
    const source = await ctx.db.get('trips', tripId);
    if (!source) throw new Error('Expected the shared trip');
    await ctx.db.patch('trips', tripId, {
      name: 'A newer shared plan',
      updatedAt: source.updatedAt + 1
    });
  });
  await expect(
    owner.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: version.proposalId,
      resolutions: [{ path: 'trip.json', choice: 'proposed' }]
    })
  ).resolves.toEqual({ kind: 'applied' });

  await expect(
    owner.client.mutation(finish, { ...approval, ...review, proposalId: version.proposalId })
  ).rejects.toThrow('changed during review');
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ approvalCount: 0, feedbackCount: 0, groamReview: null });
});

test('concurrent feedback does not discard a review of unchanged content', async () => {
  const { owner, version, review } = await submittedReview();
  await owner.client.mutation(api.routes.trips.versions.feedback.add.run, {
    content: 'Please keep the rail connection in mind.',
    proposalId: version.proposalId
  });
  await owner.client.mutation(finish, { ...approval, ...review, proposalId: version.proposalId });

  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    approvalCount: 1,
    feedbackCount: 2,
    groamReview: { status: 'passed' }
  });
});

test('reviewer settings can change without discarding an unchanged review', async () => {
  const { owner, version, review } = await submittedReview();
  await owner.client.mutation(api.routes.trips.versions.reviewers.set.run, {
    proposalId: version.proposalId,
    reviewers: []
  });
  await owner.client.mutation(finish, { ...approval, ...review, proposalId: version.proposalId });

  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ approvalCount: 1, groamReview: { status: 'passed' } });
});

test('shared-plan changes alone do not invalidate a review against the idea base', async () => {
  const { owner, tripId, version, review } = await submittedReview();
  await owner.client.run(async (ctx) => {
    const source = await ctx.db.get('trips', tripId);
    if (!source) throw new Error('Expected the shared trip');
    await ctx.db.patch('trips', tripId, {
      name: 'A newer shared plan',
      updatedAt: source.updatedAt + 1
    });
  });
  await owner.client.mutation(finish, { ...approval, ...review, proposalId: version.proposalId });

  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    approvalCount: 1,
    sourceChanged: true,
    groamReview: { status: 'passed' }
  });
});
