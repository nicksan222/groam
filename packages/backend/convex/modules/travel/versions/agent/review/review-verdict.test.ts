import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';
import { beginAgentReview, draftChangedVersion } from '#testing/versions';

const finish = internal.modules.travel.versions.agent.review.index.finish;

async function submittedIdea() {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  return { owner, proposalId: version.proposalId };
}

test('approve verdict posts a summary comment and a counted agent approval', async () => {
  const { owner, proposalId } = await submittedIdea();
  await owner.client.mutation(finish, {
    ...(await beginAgentReview(owner, proposalId)),
    comments: [{ body: 'Consider a rail pass for the last leg.', kind: 'comment' }],
    proposalId,
    summary: 'Looks sound to me.',
    verdict: 'approve'
  });
  const idea = await owner.client.query(api.routes.trips.versions.get.run, { proposalId });
  expect(idea).toMatchObject({
    approvalCount: 1,
    approvals: [{ agentId: 'reviewer', kind: 'agent', name: 'Idea reviewer' }],
    canMerge: true,
    groamReview: { commentCount: 1, status: 'passed' },
    requiredApprovals: 1,
    unresolvedFeedbackCount: 0
  });
  await expect(
    owner.client.query(api.routes.trips.versions.feedback.list.run, { proposalId })
  ).resolves.toMatchObject([
    { content: 'Looks sound to me.', kind: 'comment', reviewVerdict: 'approved' },
    { content: 'Consider a rail pass for the last leg.', kind: 'comment', reviewVerdict: null }
  ]);
  // A repeated approving review does not duplicate the approval.
  await owner.client.mutation(finish, {
    comments: [],
    proposalId,
    summary: 'Still fine.',
    ...(await beginAgentReview(owner, proposalId)),
    verdict: 'approve'
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId })
  ).resolves.toMatchObject({ approvalCount: 1 });
});

test('request_changes files change requests and withdraws a prior agent approval', async () => {
  const { owner, proposalId } = await submittedIdea();
  await owner.client.mutation(finish, {
    comments: [],
    proposalId,
    summary: 'Fine.',
    ...(await beginAgentReview(owner, proposalId)),
    verdict: 'approve'
  });
  await owner.client.mutation(finish, {
    comments: [
      { body: 'Day 2 flight lands after the hotel check-in window.', kind: 'change_request' },
      { body: 'Maybe add a museum.', kind: 'comment' }
    ],
    proposalId,
    summary: 'One blocking timing issue.',
    ...(await beginAgentReview(owner, proposalId)),
    verdict: 'request_changes'
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId })
  ).resolves.toMatchObject({
    approvalCount: 0,
    approvals: [],
    canMerge: false,
    groamReview: { status: 'changes_requested' },
    unresolvedFeedbackCount: 1
  });
  const feedback = await owner.client.query(api.routes.trips.versions.feedback.list.run, {
    proposalId
  });
  expect(feedback.map((item) => [item.kind, item.reviewVerdict])).toEqual([
    ['comment', 'approved'],
    ['comment', 'changes_requested'],
    ['change_request', null],
    ['comment', null]
  ]);
});

test('the agent cannot approve an idea that is not in review', async () => {
  const { owner, proposalId } = await submittedIdea();
  await owner.client.run(async (ctx) => {
    await ctx.db.patch('tripProposals', proposalId, { status: 'conflicted' });
  });
  await owner.client.mutation(finish, {
    comments: [],
    proposalId,
    summary: 'Fine.',
    ...(await beginAgentReview(owner, proposalId)),
    verdict: 'approve'
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId })
  ).resolves.toMatchObject({ approvalCount: 0, approvals: [] });
});

test('proposal run query returns the latest reviewer run and hides it from outsiders', async () => {
  const { owner, proposalId } = await submittedIdea();
  await expect(
    owner.client.query(api.routes.agents.runs.proposal.run, { proposalId })
  ).resolves.toMatchObject({ status: 'queued' });
  const latest = await owner.client.run(async (ctx) => {
    const runs = await ctx.db.query('agentRuns').collect();
    const queued = runs.find((run) => run.proposalId === proposalId);
    if (!queued) throw new Error('Expected queued reviewer run');
    await ctx.db.patch('agentRuns', queued._id, { status: 'complete', updatedAt: Date.now() + 1 });
    return queued._id;
  });
  await expect(
    owner.client.query(api.routes.agents.runs.proposal.run, { proposalId })
  ).resolves.toMatchObject({ id: latest, status: 'complete' });

  const outsider = await createOutsiderClient(owner.test);
  const seen = await outsider.client
    .query(api.routes.agents.runs.proposal.run, { proposalId })
    .then(
      (value) => value,
      () => null
    );
  expect(seen).toBeNull();
});
