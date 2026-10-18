import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { setupTrip } from '#testing/trips';
import { draftChangedVersion } from '#testing/versions';

const issueAgent = { agentId: 'issue' as const, kind: 'agent' as const, name: 'Issue agent' };
const functions = internal.modules.assistant.runs.functions;

async function queuedIssueRun(setup: Awaited<ReturnType<typeof setupTrip>>, title: string) {
  const issueId = await setup.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Edge fixture.',
    title,
    tripId: setup.tripId
  });
  const runId = await setup.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected a queued run');
  return { issueId, runId };
}

test(
  'finishing a run is terminal and records the report or stop headline',
  { timeout: 30_000 },
  async () => {
    const setup = await setupTrip(0);
    const { owner } = setup;
    const { runId } = await queuedIssueRun(setup, 'Report headline');

    // Empty event batches are no-ops.
    await owner.client.mutation(functions.recordToolEvents, { events: [], runId });
    await owner.client.mutation(functions.recordStepEvents, { events: [], runId });
    await expect(
      owner.client.query(api.routes.agents.runs.events.run, {
        paginationOpts: { cursor: null, numItems: 0 },
        runId
      })
    ).rejects.toThrow('event page size');

    const report = `Done. ${'x'.repeat(200)}`;
    await owner.test.run(async (ctx) => {
      await AgentRuns.finish(ctx, { report, runId, status: 'complete' });
      // A terminal run ignores later finishes and is never claimed again.
      await AgentRuns.finish(ctx, { error: 'late', runId, status: 'failed' });
      expect(await AgentRuns.claimTurn(ctx, runId)).toBeNull();
    });
    await expect(
      owner.client.query(api.routes.agents.runs.get.run, { runId })
    ).resolves.toMatchObject({ headline: report.slice(0, 160), status: 'complete' });

    const second = await queuedIssueRun(setup, 'Stopped headline');
    await owner.test.run((ctx) =>
      AgentRuns.finish(ctx, { runId: second.runId, status: 'aborted' })
    );
    await expect(
      owner.client.query(api.routes.agents.runs.get.run, { runId: second.runId })
    ).resolves.toMatchObject({ headline: 'Stopped', status: 'aborted' });
  }
);

test('run writers reject runs that no longer exist', { timeout: 30_000 }, async () => {
  const setup = await setupTrip(0);
  const { owner } = setup;
  const { runId } = await queuedIssueRun(setup, 'Deleted run');
  const version = await draftChangedVersion(owner, setup.tripId);
  await owner.test.run((ctx) => ctx.db.delete('agentRuns', runId));

  await expect(
    owner.client.mutation(functions.recordEvent, { kind: 'status', label: 'x', runId })
  ).rejects.toThrow('Agent run not found');
  await expect(
    owner.client.mutation(functions.recordToolEvents, {
      events: [{ label: 'x', ok: true, toolName: 'tool' }],
      runId
    })
  ).rejects.toThrow('Agent run not found');
  await expect(
    owner.client.mutation(functions.recordStepEvents, {
      events: [{ detail: 'd', kind: 'thought', label: 'x' }],
      runId
    })
  ).rejects.toThrow('Agent run not found');
  await expect(
    owner.test.run((ctx) => AgentRuns.finish(ctx, { runId, status: 'complete' }))
  ).rejects.toThrow('Agent run not found');
  await expect(owner.test.run((ctx) => AgentRuns.claimTurn(ctx, runId))).rejects.toThrow(
    'Agent run not found'
  );
  await expect(
    owner.test.run((ctx) => AgentRuns.attachProposal(ctx, runId, version.proposalId))
  ).rejects.toThrow('Agent run not found');
});

test(
  'attaching an idea is idempotent and refuses another group’s idea',
  { timeout: 30_000 },
  async () => {
    const setup = await setupTrip(0);
    const other = await setupTrip(0);
    const { runId } = await queuedIssueRun(setup, 'Attach idea');
    const mine = await draftChangedVersion(setup.owner, setup.tripId);
    const theirs = await draftChangedVersion(other.owner, other.tripId);

    await setup.owner.test.run(async (ctx) => {
      await AgentRuns.attachProposal(ctx, runId, mine.proposalId);
      const updatedAt = (await ctx.db.get('agentRuns', runId))?.updatedAt;
      await AgentRuns.attachProposal(ctx, runId, mine.proposalId);
      expect((await ctx.db.get('agentRuns', runId))?.updatedAt).toBe(updatedAt);
    });
    await expect(
      setup.owner.test.run((ctx) => AgentRuns.attachProposal(ctx, runId, theirs.proposalId))
    ).rejects.toThrow('Idea not found');

    // Latest-run lookups hide another group's issue and idea.
    await expect(
      other.owner.client.query(api.routes.agents.runs.proposal.run, { proposalId: mine.proposalId })
    ).resolves.toBeNull();
  }
);

test(
  'retrying a run whose issue was deleted reports the run as missing',
  { timeout: 30_000 },
  async () => {
    const setup = await setupTrip(0);
    const { issueId, runId } = await queuedIssueRun(setup, 'Deleted issue');
    await setup.owner.test.run(async (ctx) => {
      await AgentRuns.finish(ctx, { error: 'boom', runId, status: 'failed' });
      await ctx.db.delete('tripIssues', issueId);
    });
    await expect(
      setup.owner.client.mutation(api.routes.agents.runs.retry.run, { runId })
    ).rejects.toThrow('Agent run not found');
    await expect(
      setup.owner.client.query(api.routes.agents.runs.issue.run, { issueId })
    ).resolves.toBeNull();
  }
);

test(
  'discussion turns refuse non-chat agents and abort falls back to the queued run',
  { timeout: 30_000 },
  async () => {
    const { owner } = await setupTrip(0);
    const organizationId = owner.organizationId as string;
    const { discussionId, queuedId } = await owner.test.run(async (ctx) => {
      const discussionId = await ctx.db.insert('discussions', {
        shortId: 'edge0001',
        clientRequestId: 'req-edge',
        createdBy: { name: 'Owner', userId: owner.userId },
        kind: 'group',
        members: [],
        organizationId,
        title: 'Edge plans',
        updatedAt: Date.now()
      });
      const queuedId = await ctx.db.insert('agentRuns', {
        shortId: 'edgerun0',
        agentId: 'groam',
        createdBy: { name: 'Owner', userId: owner.userId },
        discussionId,
        kickoff: 'assign',
        organizationId,
        status: 'queued',
        surface: 'chat',
        threadId: 'thread-edge',
        title: 'Edge plans',
        updatedAt: Date.now()
      });
      return { discussionId, queuedId };
    });
    const base = {
      agentId: 'issue' as const,
      createdBy: { name: 'Owner', userId: owner.userId },
      discussionId,
      organizationId,
      threadId: 'thread-edge',
      title: 'Edge plans'
    };
    await expect(owner.test.run((ctx) => AgentRuns.queueDiscussionTurn(ctx, base))).rejects.toThrow(
      'Only chat agents'
    );
    await expect(
      owner.test.run((ctx) =>
        AgentRuns.claimDiscussionTurn(ctx, {
          ...base,
          actorTokenIdentifier: 'token',
          discussionUpdatedAt: Date.now(),
          promptMessageId: 'prompt',
          screen: {} as never
        } as never)
      )
    ).rejects.toThrow('Only chat agents');

    await owner.test.run(async (ctx) => {
      await AgentRuns.abortActiveForDiscussion(ctx, discussionId);
      expect((await ctx.db.get('agentRuns', queuedId))?.status).toBe('aborted');
      // Nothing active is left to abort.
      await AgentRuns.abortActiveForDiscussion(ctx, discussionId);
    });
  }
);
