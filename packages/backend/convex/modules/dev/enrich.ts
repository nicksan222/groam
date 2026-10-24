import { ConvexError, v } from 'convex/values';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { internalWorkspaceMutation, type Workspace } from '#convex/modules/auth/workspace';
import { discussionRateLimiter } from '#convex/modules/discussions/threads/limits';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { TripIssues } from '#convex/modules/travel/issues/index';
import type { TripIssueStatus } from '#convex/modules/travel/issues/status';
import {
  assertPlanner,
  loadTripContext,
  type MutableTripCtx,
  withSeedWrites
} from '#convex/modules/travel/trips/ctx';
import { TripVersions } from '#convex/modules/travel/versions/index';
import { enrichCollaboration } from './enrich/collaboration';
import { enrichItinerary } from './enrich/itinerary';
import { fixtureMoney } from './enrich/money';
import { enrichResearch } from './enrich/research';
import { assertLocalDevelopment } from './local';

export const enrichArgs = { tripId: v.id('trips'), scenarioIndex: v.number() };
export const enrichmentResult = v.object({
  archived: v.boolean(),
  ideas: v.number(),
  issues: v.number(),
  packingItems: v.number(),
  researches: v.number(),
  stays: v.number()
});

const issuePlans: { title: string; body: string; status: TripIssueStatus; comment: string }[] = [
  {
    title: 'Confirm the last-mile arrival plan',
    body: 'Compare a direct transit route with a taxi fallback. We will have luggage and one traveler arrives later. Record the last departure and where the group meets.',
    status: 'in_progress',
    comment:
      'I have the arrival details. Waiting for the late traveler to confirm their flight before choosing the ticket.'
  },
  {
    title: 'Check step-free access before paying the deposit',
    body: 'Ask the accommodation to confirm the lift, entrance steps, bathroom access, and room location. An accessibility icon alone is not enough.',
    status: 'open',
    comment:
      'Please get written confirmation from the host. The linked research has the exact questions to ask.'
  },
  {
    title: 'Keep one rainy-day alternative',
    body: 'Choose an indoor option close to the itinerary, with a flexible booking policy. Leave enough time for lunch and transit.',
    status: 'closed',
    comment: 'We agreed to keep the afternoon flexible and decide after the forecast is available.'
  },
  {
    title: 'Skip the prepaid private excursion',
    body: 'The private excursion would use most of the shared activity budget. Compare it with exploring independently.',
    status: 'wont_do',
    comment: 'Passed on this option: the group prefers a slower day and a refundable plan.'
  }
];

async function enrichIssues(ctx: MutationCtx, trip: MutableTripCtx) {
  const existing = await ctx.db
    .query('tripIssues')
    .withIndex('by_tripId_and_updatedAt', (q) => q.eq('tripId', trip.trip._id))
    .take(500);
  const byTitle = new Map(existing.toReversed().map((issue) => [issue.title, issue]));
  const ids: Id<'tripIssues'>[] = [];
  let created = 0;
  for (const [index, plan] of issuePlans.entries()) {
    const found = byTitle.get(plan.title);
    if (found) {
      ids.push(found._id);
      continue;
    }
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Ordered fixture writes.
    const id = await TripIssues.create(trip, {
      title: plan.title,
      body: plan.body,
      doneWhen: 'The group has a written decision with a confirmed fallback.'
    });
    ids.push(id);
    created += 1;
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Comments and lifecycle require the new issue.
    await TripIssues.addComment(ctx, id, plan.comment);
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Use normal assignment checks without starting an agent.
    await TripIssues.setAssignee(ctx, id, {
      kind: 'user',
      name: trip.workspace.viewerName,
      userId: trip.workspace.userId
    });
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Use normal lifecycle checks and events.
    await TripIssues.setStatus(ctx, id, plan.status);
    if (index < 2) {
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each deadline is attached to its issue.
      await TripIssues.setDueAt(ctx, id, Date.now() + (index === 0 ? -1 : 5) * 86_400_000);
    }
  }
  return { created, ids };
}

async function enrichIdeas(ctx: MutationCtx, trip: MutableTripCtx) {
  const existing = await ctx.db
    .query('tripProposals')
    .withIndex('by_sourceTripId_and_updatedAt', (q) => q.eq('sourceTripId', trip.trip._id))
    .take(50);
  const byTitle = new Map(existing.toReversed().map((idea) => [idea.title, idea]));
  let created = 0;
  let ideaId: Id<'tripProposals'> | undefined;
  for (const [index, title] of [
    'Leave room for a neighborhood afternoon',
    'Replace the flexible day with a private tour'
  ].entries()) {
    const found = byTitle.get(title);
    if (found) {
      if (index === 0) ideaId = found._id;
      continue;
    }
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Real proposal working copies are created in order.
    const idea = await TripVersions.create(ctx, trip.trip._id, { title });
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Add a real change to this working copy.
    await addIdeaChange(ctx, idea.workingTripId, index);
    if (index === 0) ideaId = idea.proposalId;
    else {
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Closing a draft never launches an AI review.
      await TripVersions.close(
        ctx,
        idea.proposalId,
        'The group prefers a flexible afternoon and a smaller activity budget.'
      );
    }
    created += 1;
  }
  return { created, ideaId };
}

/** Only invoked by the local guard below or authenticated internal test fixtures. Never runs AI. */
export async function writeEnrichment(
  ctx: MutationCtx,
  input: { tripId: Id<'trips'>; scenarioIndex: number },
  workspace: Workspace
) {
  assertLocalDevelopment();
  if (
    !Number.isInteger(input.scenarioIndex) ||
    input.scenarioIndex < 0 ||
    input.scenarioIndex > 1000
  )
    throw new ConvexError('Invalid seed scenario index');
  const trip = await loadTripContext(ctx, input.tripId, workspace);
  assertPlanner(trip);
  if (trip.trip.proposal) throw new ConvexError('Start from the shared trip');
  if (trip.trip.archive !== undefined)
    return { archived: true, ideas: 0, issues: 0, packingItems: 0, researches: 0, stays: 0 };
  return await withSeedWrites(async () => {
    const itinerary = await enrichItinerary(ctx, trip, input.scenarioIndex);
    // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- Domain writes share trip events and rate buckets; finish them before cloning proposal snapshots.
    const issues = await enrichIssues(ctx, trip);
    // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- Proposal working copies must include the preceding itinerary and planning writes.
    const ideas = await enrichIdeas(ctx, trip);
    // Seed-only quotas are reset after normal workspace and planner checks. Production guards stay intact.
    await discussionRateLimiter.reset(ctx, 'discussionCreate', { key: workspace.tokenIdentifier });
    await discussionRateLimiter.reset(ctx, 'discussionMessage', { key: workspace.tokenIdentifier });
    const researches = await enrichResearch(ctx, trip, {
      ...itinerary,
      issues: issues.ids,
      ...(ideas.ideaId ? { ideaId: ideas.ideaId } : {})
    });
    await discussionRateLimiter.reset(ctx, 'discussionCreate', { key: workspace.tokenIdentifier });
    await enrichCollaboration(ctx, trip, input.scenarioIndex);
    return {
      archived: false,
      ideas: ideas.created,
      issues: issues.created,
      packingItems: itinerary.packingItems,
      researches,
      stays: itinerary.createdStays
    };
  });
}

export async function enrichLocalTrip(
  ctx: MutationCtx,
  input: { tripId: Id<'trips'>; scenarioIndex: number },
  workspace: Workspace
) {
  assertLocalDevelopment();
  return await writeEnrichment(ctx, input, workspace);
}

export const write = internalWorkspaceMutation({
  args: enrichArgs,
  returns: enrichmentResult,
  handler: (ctx, input) => writeEnrichment(ctx, input, ctx.workspace)
});

async function addIdeaChange(ctx: MutationCtx, workingTripId: Id<'trips'>, index: number) {
  const [destinations, working] = await Promise.all([
    TripDestination.forTrip(ctx, workingTripId),
    ctx.db.get('trips', workingTripId)
  ]);
  const [destination] = destinations;
  if (!working) throw new ConvexError('Seed working trip not found');
  if (destination) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Create actual changes rather than empty idea fixtures.
    await ItineraryActivity.add(ctx, workingTripId, destination._id, {
      title: index === 0 ? 'Unhurried neighborhood walk and cafe stop' : 'Private guided excursion',
      notes:
        index === 0
          ? 'Keep this flexible. Choose the route after checking the weather and everyone’s energy.'
          : 'Local demo alternative: expensive and less flexible; retained to show why the group passed.',
      schedule: { day: destination.schedule?.startDay ?? 1, timeBlock: 'afternoon' },
      cost: {
        amount: fixtureMoney(index === 0 ? 18 : 280, working.currency),
        split: index === 0 ? 'per_person' : 'total'
      }
    });
  }
}
