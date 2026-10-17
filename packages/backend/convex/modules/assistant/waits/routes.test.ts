import { mockModel } from '@convex-dev/agent';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';
import { runUntil } from '#testing/workflows';

// Runs advance through workflow steps on scheduled functions.
vi.useRealTimers();
afterEach(() => vi.restoreAllMocks());

function waitThenResume() {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: mockModel({
      contentSteps: [
        [
          {
            input: JSON.stringify({ condition: { kind: 'timer' }, deadlineHours: 3 }),
            toolCallId: 'w',
            toolName: 'waitFor',
            type: 'tool-call' as const
          }
        ],
        [{ text: 'Resumed.', type: 'text' as const }]
      ]
    }),
    modelId: 'm'
  } as never);
}

async function waitingIssueRun() {
  waitThenResume();
  const trip = await setupTrip(1);
  const issueId = await trip.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'b',
    title: 'Wait',
    tripId: trip.tripId
  });
  const runId = (await trip.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' },
    issueId
  })) as Id<'agentRuns'>;
  const read = () => trip.owner.test.run((ctx) => ctx.db.get('agentRuns', runId));
  await runUntil(trip.owner.test, async () => (await read())?.status === 'waiting');
  return { ...trip, read, runId };
}

test('the run wait route shows label, deadline, and status', { timeout: 20_000 }, async () => {
  const { owner, runId } = await waitingIssueRun();
  const wait = await owner.client.query(api.routes.agents.waits.run.run, { runId });
  expect(wait).toMatchObject({ kind: 'timer', label: 'a timer', progress: null, runId });
  expect(wait?.status).toBe('waiting');
  expect(wait?.deadlineAt).toBeGreaterThan(Date.now() + 2 * 60 * 60 * 1000);
});

test(
  'outsiders cannot read or cancel a wait; a non-admin member cannot cancel; the creator can and the run resumes',
  { timeout: 20_000 },
  async () => {
    const { owner, read, runId, users } = await waitingIssueRun();
    const wait = await owner.client.query(api.routes.agents.waits.run.run, { runId });
    if (!wait) throw new Error('Expected a wait');
    const outsider = await createOutsiderClient(owner.test);
    await expect(outsider.client.query(api.routes.agents.waits.run.run, { runId })).rejects.toThrow(
      'Agent run not found'
    );
    await expect(
      outsider.client.mutation(api.routes.agents.waits.cancel.run, { waitId: wait.id })
    ).rejects.toThrow('Wait not found');
    const member = users[0];
    if (!member) throw new Error('Expected a member');
    await expect(
      member.client.mutation(api.routes.agents.waits.cancel.run, { waitId: wait.id })
    ).rejects.toThrow('Only the trip creator or a group admin');
    await owner.client.mutation(api.routes.agents.waits.cancel.run, { waitId: wait.id });
    await runUntil(owner.test, async () => (await read())?.status === 'complete');
    expect(await read()).toMatchObject({ report: 'Resumed.' });
    await expect(owner.client.query(api.routes.agents.waits.run.run, { runId })).resolves.toBe(
      null
    );
    // Cancelling an already resolved wait is a no-op.
    await owner.client.mutation(api.routes.agents.waits.cancel.run, { waitId: wait.id });
  }
);

test(
  'the discussion wait route lists waiting runs to members only',
  { timeout: 20_000 },
  async () => {
    waitThenResume();
    const { owner, tripId, users } = await setupTrip(1);
    const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
      clientRequestId: crypto.randomUUID(),
      memberUserIds: users.map((user) => user.userId),
      title: 'Dinner',
      tripId
    });
    await expect(
      owner.client.query(api.routes.agents.waits.discussion.run, { discussionId })
    ).resolves.toEqual([]);
    const sent = await owner.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: crypto.randomUUID(),
      discussionId,
      text: '@groam check back in three hours'
    });
    await owner.client.action(api.routes.discussions.messages.respond.run, {
      discussionId,
      promptMessageId: sent.messageId,
      screen: {
        capabilities: [],
        data: '{}',
        description: 'Chat',
        key: `chat:${discussionId}`,
        target: { kind: 'workspace' },
        title: 'Dinner'
      }
    });
    await runUntil(
      owner.test,
      async () =>
        (await owner.client.query(api.routes.agents.waits.discussion.run, { discussionId }))
          .length === 1
    );
    const [wait] = await owner.client.query(api.routes.agents.waits.discussion.run, {
      discussionId
    });
    expect(wait).toMatchObject({ kind: 'timer', label: 'a timer', status: 'waiting' });
    const outsider = await createOutsiderClient(owner.test);
    await expect(
      outsider.client.query(api.routes.agents.waits.discussion.run, { discussionId })
    ).rejects.toThrow('Discussion not found');
  }
);
