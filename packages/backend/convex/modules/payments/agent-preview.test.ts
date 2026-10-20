import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { queuePreviewDiscussionRun } from '#testing/agent-preview';
import { createOutsiderClient } from '#testing/factory';
import { setupBillableTrip } from '#testing/payments';
import { openTripDraft } from '#testing/trips';

const resolve = api.routes.references.resolve.run;
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function payments() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_previews');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_previews');
}
async function issueRun(
  fixture: Awaited<ReturnType<typeof setupBillableTrip>>,
  tripId = fixture.tripId
) {
  const issueId = await fixture.owner.client.mutation(api.routes.trips.issues.create.run, {
    tripId,
    title: 'Protected run title',
    body: 'Protected instructions'
  });
  const runId = await fixture.owner.client.mutation(api.routes.trips.issues.assign.run, {
    issueId,
    assignee: { kind: 'agent', agentId: 'issue', name: 'Issue agent' }
  });
  if (!runId) throw new Error('Expected queued run');
  return runId;
}

test.each(['unpaid', 'paid', 'disabled'])(
  '%s run reference exposes only navigation identifiers while content retains its gate',
  async (mode) => {
    payments();
    const fixture = await setupBillableTrip(1);
    const member = fixture.users[0]!;
    const runId = await issueRun(fixture);
    if (mode === 'disabled') vi.stubEnv('STRIPE_SECRET_KEY', '');
    if (mode === 'paid') {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          Response.json({
            id: 'cs_preview',
            url: null,
            status: 'complete',
            payment_status: 'paid',
            amount_total: 100,
            currency: 'eur',
            metadata: {}
          })
        )
      );
      await fixture.owner.client.action(api.routes.trips.payments.checkout.run, {
        tripId: fixture.tripId,
        userId: member.userId
      });
    }
    const reference = await member.client.query(resolve, { table: 'agentRuns', reference: runId });
    expect(reference).toEqual({ id: runId, shortId: expect.any(String), tripId: fixture.tripId });
    expect(
      await member.client.query(resolve, { table: 'agentRuns', reference: reference!.shortId })
    ).toEqual(reference);
    const content = member.client.query(api.routes.agents.runs.get.run, { runId });
    if (mode === 'unpaid') await expect(content).rejects.toThrow('Agent run not found');
    else expect((await content).title).toBe('Protected run title');
    const outsider = await createOutsiderClient(fixture.owner.test);
    expect(
      await outsider.client.query(resolve, { table: 'agentRuns', reference: runId })
    ).toBeNull();
  }
);

test('discussion-run preview preserves member audiences despite allowing unpaid navigation', async () => {
  payments();
  const fixture = await setupBillableTrip(2);
  const member = fixture.users[0]!;
  const discussionId = await fixture.owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [member.userId],
    title: 'Private linked chat',
    tripId: fixture.tripId
  });
  await fixture.owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId,
    text: '@groam Help with trip'
  });
  const run = (
    await fixture.owner.client.query(api.routes.agents.runs.workspace.run, {
      paginationOpts: { cursor: null, numItems: 25 }
    })
  ).page[0]!;
  expect(await member.client.query(resolve, { table: 'agentRuns', reference: run.id })).toEqual({
    id: run.id,
    shortId: run.shortId,
    tripId: fixture.tripId
  });
  await expect(
    member.client.query(api.routes.agents.runs.get.run, { runId: run.id })
  ).rejects.toThrow('Agent run not found');
  expect(
    await fixture.users[1]!.client.query(resolve, { table: 'agentRuns', reference: run.id })
  ).toBeNull();
});

test('private standalone research and assistant run references remain creator-only', async () => {
  payments();
  const fixture = await setupBillableTrip(1);
  const member = fixture.users[0]!;
  const research = await fixture.owner.client.mutation(
    internal.modules.assistant.research.functions.queue,
    { tripId: fixture.tripId, topic: 'Private question', effort: 'quick' }
  );
  const threadId = await fixture.owner.client.action(api.routes.assistant.chats.create.run, {
    screen: {
      capabilities: [],
      data: '{}',
      description: 'Home',
      key: 'workspace:home',
      target: { kind: 'workspace' },
      title: 'Home'
    }
  });
  const assistant = await queuePreviewDiscussionRun(fixture.owner.test, {
    threadId,
    userId: fixture.owner.userId,
    organizationId: fixture.owner.organizationId!
  });
  for (const runId of [research, assistant]) {
    const reference = await fixture.owner.client.query(resolve, {
      table: 'agentRuns',
      reference: runId
    });
    expect(reference).toMatchObject({ id: runId, shortId: expect.any(String) });
    expect(await member.client.query(resolve, { table: 'agentRuns', reference: runId })).toBeNull();
    await expect(member.client.query(api.routes.agents.runs.get.run, { runId })).rejects.toThrow(
      'Agent run not found'
    );
  }
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  for (const runId of [research, assistant]) {
    expect(await member.client.query(resolve, { table: 'agentRuns', reference: runId })).toBeNull();
  }
  expect(
    await fixture.owner.client.query(resolve, { table: 'agentRuns', reference: assistant })
  ).not.toHaveProperty('tripId');
});

test('a working-copy run preview points at its canonical shared trip', async () => {
  payments();
  const fixture = await setupBillableTrip(1);
  const draft = await openTripDraft(fixture.owner, fixture.tripId);
  const discussionId = await fixture.owner.client.mutation(
    api.routes.discussions.research.create.run,
    {
      clientRequestId: crypto.randomUUID(),
      title: 'Draft private contents',
      tripId: draft.workingTripId
    }
  );
  const runId = await fixture.owner.client.mutation(api.routes.discussions.research.start.run, {
    discussionId,
    topic: 'Draft research contents',
    effort: 'quick'
  });
  expect(
    await fixture.users[0]!.client.query(resolve, { table: 'agentRuns', reference: runId })
  ).toEqual({ id: runId, shortId: expect.any(String), tripId: fixture.tripId });
  await fixture.owner.client.mutation(api.routes.discussions.research.remove.run, { discussionId });
  expect(
    await fixture.users[0]!.client.query(resolve, { table: 'agentRuns', reference: runId })
  ).toBeNull();
});
