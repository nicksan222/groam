import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { openTripDraft, setupTrip } from '#testing/trips';
import { changedTripDetails } from '#testing/versions';

const paginationOpts = { cursor: null, numItems: 10 };
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function enablePayments() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_agents');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_agents');
}
async function protectedRuns() {
  const fixture = await setupTrip(1);
  const issueId = await fixture.owner.client.mutation(api.routes.trips.issues.create.run, {
    tripId: fixture.tripId,
    title: 'Protected issue title',
    body: 'Protected issue instructions'
  });
  const issueRunId = await fixture.owner.client.mutation(api.routes.trips.issues.assign.run, {
    issueId,
    assignee: { kind: 'agent', agentId: 'issue', name: 'Issue agent' }
  });
  if (!issueRunId) throw new Error('Expected queued issue run');
  const draft = await openTripDraft(fixture.owner, fixture.tripId, { issueId });
  await fixture.owner.client.mutation(api.routes.trips.update.run, {
    tripId: draft.workingTripId,
    input: changedTripDetails
  });
  await fixture.owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: draft.proposalId
  });
  const review = await fixture.owner.client.query(api.routes.agents.runs.proposal.run, {
    proposalId: draft.proposalId
  });
  if (!review) throw new Error('Expected queued review run');
  return {
    ...fixture,
    member: fixture.users[0]!,
    issueId,
    issueRunId,
    reviewRunId: review.id,
    proposalId: draft.proposalId
  };
}

test('unpaid members cannot read, control, or review protected agent runs through adjacent APIs', async () => {
  enablePayments();
  const { member, tripId, issueId, issueRunId, reviewRunId, proposalId } = await protectedRuns();
  expect(
    (await member.client.query(api.routes.agents.runs.workspace.run, { paginationOpts })).page
  ).toEqual([]);
  for (const agentId of ['issue', 'reviewer'] as const) {
    expect(
      (await member.client.query(api.routes.agents.runs.list.run, { agentId, paginationOpts })).page
    ).toEqual([]);
  }
  for (const runId of [issueRunId, reviewRunId]) {
    await expect(member.client.query(api.routes.agents.runs.get.run, { runId })).rejects.toThrow(
      'Agent run not found'
    );
    await expect(
      member.client.query(api.routes.agents.runs.events.run, { runId, paginationOpts })
    ).rejects.toThrow('Agent run not found');
    await expect(member.client.query(api.routes.agents.waits.run.run, { runId })).rejects.toThrow(
      'Agent run not found'
    );
    await expect(
      member.client.mutation(api.routes.agents.runs.stop.run, { runId })
    ).rejects.toThrow('Agent run not found');
    await expect(
      member.client.mutation(api.routes.agents.runs.retry.run, { runId })
    ).rejects.toThrow('Agent run not found');
    await expect(member.client.action(api.routes.agents.runs.start.run, { runId })).rejects.toThrow(
      'Agent run not found'
    );
  }
  expect(await member.client.query(api.routes.agents.runs.issue.run, { issueId })).toBeNull();
  expect(await member.client.query(api.routes.agents.runs.proposal.run, { proposalId })).toBeNull();
  for (const activity of [{ tripId }, { issueId }, { proposalId }]) {
    expect(
      await member.client.query(api.routes.agents.issues.run, { agentId: 'issue', ...activity })
    ).toEqual([]);
  }
  const roster = await member.client.query(api.routes.agents.list.run, {});
  expect(roster.find((agent) => agent.id === 'issue')).toMatchObject({
    assignedIssueCount: 0,
    latestRun: null
  });
  expect(roster.find((agent) => agent.id === 'reviewer')).toMatchObject({ latestRun: null });
  await expect(
    member.client.action(api.routes.trips.versions.reviewers.agent.run.run, { proposalId })
  ).rejects.toThrow('Idea trip not found');
});

test.each(['paid', 'disabled', 'legacy'])(
  '%s access keeps issue and idea agent runs readable',
  async (access) => {
    if (access === 'legacy') vi.stubEnv('STRIPE_SECRET_KEY', '');
    else enablePayments();
    const { owner, member, tripId, issueId, issueRunId, reviewRunId, proposalId } =
      await protectedRuns();
    if (access === 'disabled') vi.stubEnv('STRIPE_SECRET_KEY', '');
    if (access === 'legacy') enablePayments();
    if (access === 'paid') {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          Response.json({
            id: 'cs_agents',
            url: null,
            status: 'complete',
            payment_status: 'paid',
            amount_total: 100,
            currency: 'eur',
            metadata: {}
          })
        )
      );
      await owner.client.action(api.routes.trips.payments.checkout.run, {
        tripId,
        userId: member.userId
      });
    }
    const workspace = await member.client.query(api.routes.agents.runs.workspace.run, {
      paginationOpts
    });
    expect(new Set(workspace.page.map((run) => run.id))).toEqual(
      new Set([issueRunId, reviewRunId])
    );
    for (const runId of [issueRunId, reviewRunId]) {
      expect((await member.client.query(api.routes.agents.runs.get.run, { runId })).id).toBe(runId);
      expect(
        (await member.client.query(api.routes.agents.runs.events.run, { runId, paginationOpts }))
          .page
      ).toEqual([]);
    }
    expect((await member.client.query(api.routes.agents.runs.issue.run, { issueId }))?.id).toBe(
      issueRunId
    );
    expect(
      (await member.client.query(api.routes.agents.runs.proposal.run, { proposalId }))?.id
    ).toBe(reviewRunId);
    expect(
      await member.client.query(api.routes.agents.issues.run, { agentId: 'issue', tripId })
    ).toHaveLength(1);
    expect(
      (await member.client.query(api.routes.agents.list.run, {})).find(
        (agent) => agent.id === 'issue'
      )?.assignedIssueCount
    ).toBe(1);
  }
);
