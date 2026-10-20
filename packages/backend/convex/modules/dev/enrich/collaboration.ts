import type { MutationCtx } from '#convex-generated/server';
import { workspaceRoster } from '#convex/modules/auth/workspace';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { Polls } from '#convex/modules/polls/index';
import type { MutableTripCtx } from '#convex/modules/travel/trips/ctx';

/** One small planning chat, with a real owner vote; never impersonates other travelers. */
export async function enrichCollaboration(
  ctx: MutationCtx,
  trip: MutableTripCtx,
  scenario: number
) {
  if (scenario % 4 !== 0) return;
  const { workspace } = trip;
  const clientRequestId = `seed-rich-chat-v1:${trip.trip._id}`;
  const existing = await ctx.db
    .query('discussions')
    .withIndex('by_organizationId_and_createdBy_userId_and_clientRequestId', (q) =>
      q
        .eq('organizationId', workspace.organizationId)
        .eq('createdBy.userId', workspace.userId)
        .eq('clientRequestId', clientRequestId)
    )
    .unique();
  if (existing) return;
  const roster = await workspaceRoster(ctx, workspace);
  const others = roster.members.filter((member) => member.userId !== workspace.userId).slice(0, 3);
  if (others.length === 0) return;
  const discussionId = await Discussions.create(ctx, {
    clientRequestId,
    memberUserIds: others.map((member) => member.userId),
    title: `Arrival plans · ${trip.trip.name}`.slice(0, 80),
    tripId: trip.trip._id
  });
  await Discussions.send(ctx, {
    discussionId,
    clientRequestId: `seed-rich-chat-note-v1:${trip.trip._id}`,
    text: 'I collected the arrival questions in the linked trip research. Let’s agree on a meeting point before booking anything non-refundable.'
  });
  await Discussions.send(ctx, {
    discussionId,
    clientRequestId: `seed-rich-chat-followup-v1:${trip.trip._id}`,
    text: 'For the first evening, I’d keep dinner near the accommodation so late arrivals can join easily. Please vote on the pace below.'
  });
  const pollId = await Polls.create(
    ctx,
    workspace,
    {
      discussionId,
      tripId: trip.trip._id,
      multiSelect: false,
      question: 'How should we spend the first evening?',
      options: [
        'Easy dinner near the accommodation',
        'Short walk, then dinner',
        'Keep it completely unplanned'
      ]
    },
    { kind: 'user', name: workspace.viewerName, userId: workspace.userId }
  );
  await Polls.vote(ctx, workspace, pollId, ['o1']);
  if (scenario % 8 === 0) await Polls.close(ctx, workspace, pollId);
}
