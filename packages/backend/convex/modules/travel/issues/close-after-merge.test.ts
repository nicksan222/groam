import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { openTripDraft, setupReviewedTrip } from '#testing/trips';
import { changedTripDetails, mergeIdea } from '#testing/versions';

const timeout = 30_000;

test.each([
  ['open', 'closed', 1],
  ['in_progress', 'closed', 1],
  ['closed', 'closed', 0],
  ['wont_do', 'wont_do', 0]
] as const)(
  'merging an idea for a %s issue leaves it %s with %s closing comments',
  { timeout },
  async (status, expected, closingComments) => {
    const { owner, reviewer, tripId } = await setupReviewedTrip();
    const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
      body: 'Settle the destination.',
      title: 'Pick a place',
      tripId
    });
    if (status !== 'open') {
      await owner.client.mutation(api.routes.trips.issues.status.run, { issueId, status });
    }
    const version = await openTripDraft(owner, tripId, { issueId });
    await owner.client.mutation(api.routes.trips.update.run, {
      input: changedTripDetails,
      tripId: version.workingTripId
    });
    const linked = await owner.client.query(api.routes.trips.versions.get.run, {
      proposalId: version.proposalId
    });
    expect(linked.issue?.status).toBe(status);

    await mergeIdea(owner, reviewer, version.proposalId);

    const issue = await owner.client.query(api.routes.trips.issues.get.run, { issueId });
    expect(issue?.status).toBe(expected);
    if (expected === 'closed') expect(issue?.closedAt).toEqual(expect.any(Number));
    const closing = issue?.comments.filter((comment) => comment.content.includes('by applying'));
    expect(closing).toHaveLength(closingComments);
  }
);
