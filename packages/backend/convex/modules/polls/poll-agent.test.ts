import { mockModel } from '@convex-dev/agent';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { setupTrip } from '#testing/trips';
import { waitingChatTurn } from '#testing/waits';
import { runUntil } from '#testing/workflows';

// Runs advance through workflow steps on scheduled functions.
vi.useRealTimers();
afterEach(() => vi.restoreAllMocks());

test(
  'an agent asks the group with a poll, waits, and continues when everyone voted',
  { timeout: 30_000 },
  async () => {
    vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
      languageModel: mockModel({
        contentSteps: [
          [
            {
              input: JSON.stringify({
                multiSelect: false,
                options: ['Sushi', 'Tapas'],
                question: 'Dinner Friday',
                waitFor: { deadlineHours: 24, rule: [{ kind: 'allVoted' }] }
              }),
              toolCallId: 'poll-1',
              toolName: 'createPoll',
              type: 'tool-call' as const
            }
          ],
          [{ text: 'Sushi it is — I will add it to Friday.', type: 'text' as const }]
        ]
      }),
      modelId: 'm'
    } as never);
    const trip = await setupTrip(1);
    const { owner, tripId, users } = trip;
    const [member] = users;
    if (!member) throw new Error('Expected a member');
    const { discussionId, run } = await waitingChatTurn(
      trip,
      '@groam ask everyone where to eat Friday'
    );
    const [poll] = await owner.client.query(api.routes.polls.list.discussion.run, {
      discussionId
    });
    if (!poll) throw new Error('Expected the agent poll');
    expect(poll).toMatchObject({
      canClose: true,
      createdBy: { kind: 'agent', name: 'Groam' },
      discussionId,
      eligibleCount: 2,
      tripId
    });
    await owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId: poll.id });
    expect((await run())?.status).toBe('waiting');
    await member.client.mutation(api.routes.polls.vote.run, {
      optionIds: ['o1'],
      pollId: poll.id
    });
    await runUntil(owner.test, async () => (await run())?.status === 'complete');
    const finished = await run();
    expect(finished).toMatchObject({
      report: 'Sushi it is — I will add it to Friday.',
      status: 'complete'
    });
    const wait = await owner.test.run((ctx) =>
      ctx.db
        .query('agentWaits')
        .withIndex('by_runId', (query) => query.eq('runId', finished?._id as Id<'agentRuns'>))
        .unique()
    );
    expect(wait?.outcome?.summary).toBe(
      "everyone voted for 'Dinner Friday' — Sushi 2, Tapas 0; 2 of 2 voted"
    );
  }
);
