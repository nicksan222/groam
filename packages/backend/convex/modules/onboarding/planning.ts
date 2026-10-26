import { saveMessages } from '@convex-dev/agent';
import { assistantAgents } from '@groam/ai/agents';
import { components } from '#convex-generated/api';
import type { MutationCtx } from '#convex-generated/server';
import { DiscussionLinks } from '#convex/modules/discussions/links/index';
import { Research } from '#convex/modules/discussions/research/index';
import { Polls } from '#convex/modules/polls/index';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { TripIssues } from '#convex/modules/travel/issues/index';
import type { MutableTripCtx } from '#convex/modules/travel/trips/ctx';
import { TripVersions } from '#convex/modules/travel/versions/index';
import { seedDemoAgents } from './agents';

export async function seedDemoPlanning(ctx: MutationCtx, trip: MutableTripCtx): Promise<void> {
  const issueId = await TripIssues.create(trip, {
    title: 'Demo: Keep a rainy-day alternative',
    body: 'Example agent task: propose an indoor alternative without changing the shared itinerary.',
    doneWhen:
      'A flexible alternative is recorded in an idea and its access requirements are checked.'
  });
  // Static example assignment: the normal assignment route would launch a live workflow.
  await ctx.db.patch('tripIssues', issueId, {
    assignee: { kind: 'agent', agentId: 'issue', name: assistantAgents.issue.label },
    status: 'in_progress'
  });
  const idea = await TripVersions.create(ctx, trip.trip._id, {
    issueId,
    title: 'Demo: A flexible gallery afternoon',
    ideaName: 'demo-rainy-day'
  });
  const [destination] = await TripDestination.forTrip(ctx, idea.workingTripId);
  if (!destination) throw new Error('Demo idea destination was not cloned');
  await ItineraryActivity.add(ctx, idea.workingTripId, destination._id, {
    title: 'Demo: Indoor gallery alternative',
    notes: 'Proposed example only. Verify step-free access, opening hours and refundable tickets.',
    schedule: { day: 2, timeBlock: 'afternoon' },
    cost: { amount: 15, split: 'per_person' }
  });
  const discussionId = await Research.create(ctx, {
    clientRequestId: 'onboarding-demo-research-v1',
    title: 'Demo: Compare rainy-day options',
    tripId: trip.trip._id,
    brief:
      'Illustrative agent research. No model or web search was run; verify real details before booking.'
  });
  await DiscussionLinks.link(ctx, discussionId, { kind: 'issue', issueId });
  await DiscussionLinks.link(ctx, discussionId, { kind: 'idea', proposalId: idea.proposalId });
  const research = await ctx.db.get('discussions', discussionId);
  if (!research?.threadId) throw new Error('Demo research thread was not created');
  await saveMessages(ctx, components.agent, {
    threadId: research.threadId,
    agentName: 'researcher',
    messages: [
      {
        role: 'assistant',
        content:
          'Demo research example — no AI or web search was run. A gallery keeps the afternoon indoors; a cafe stop costs less and stays flexible. Verify access and opening hours, then compare the linked idea before applying any change.'
      }
    ]
  });
  await ctx.db.patch('discussions', discussionId, {
    lastMessage: {
      authorName: assistantAgents.researcher.label,
      text: 'Demo: Options and next checks prepared.'
    }
  });
  await Polls.create(
    ctx,
    trip.workspace,
    {
      tripId: trip.trip._id,
      multiSelect: false,
      question: 'Demo: Which rainy-day plan would you choose?',
      options: ['Indoor gallery', 'Cafe and a shorter walk', 'Leave the afternoon open']
    },
    { kind: 'user', name: trip.workspace.viewerName, userId: trip.workspace.userId }
  );
  await seedDemoAgents(ctx, trip, {
    issueId,
    proposalId: idea.proposalId,
    workingTripId: idea.workingTripId,
    discussionId
  });
}
