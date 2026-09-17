import { ConvexError, v } from 'convex/values';
import { internalWorkspaceMutation, type Workspace } from '#convex/modules/auth/workspace';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { TripCover } from '#convex/modules/travel/covers/index';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { archiveTrip, loadTripContext, withSeedWrites } from '#convex/modules/travel/trips/ctx';
import { createTrip } from '#convex/modules/travel/trips/index';
import { TripValidators } from '#convex/modules/travel/trips/schema';
import { TripVersions } from '#convex/modules/travel/versions/index';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { assertLocalDevelopment } from './local';
import { seedItineraryArgs, writeSeedItinerary } from './populate';

const proposalActivity = v.object({
  notes: v.string(),
  title: v.string()
});

export const seedWorkspaceTripArgs = {
  plans: v.array(
    v.object({
      activities: seedItineraryArgs.activities,
      additionalDestinations: seedItineraryArgs.additionalDestinations,
      archived: v.boolean(),
      create: TripValidators.createInput,
      primary: seedItineraryArgs.primary,
      proposal: v.optional(proposalActivity)
    })
  )
};

export type SeedWorkspaceTripPlan = {
  activities: Parameters<typeof writeSeedItinerary>[1]['activities'];
  additionalDestinations: Parameters<typeof writeSeedItinerary>[1]['additionalDestinations'];
  archived: boolean;
  create: Parameters<typeof createTrip>[1];
  primary?: Parameters<typeof writeSeedItinerary>[1]['primary'];
  proposal?: { notes: string; title: string };
};

export async function seedWorkspaceTrips(
  ctx: MutationCtx,
  plans: SeedWorkspaceTripPlan[],
  workspace: Workspace
): Promise<Id<'trips'>[]> {
  assertLocalDevelopment();
  return await writeSeedWorkspaceTrips(ctx, plans, workspace);
}

export async function writeSeedWorkspaceTrips(
  ctx: MutationCtx,
  plans: SeedWorkspaceTripPlan[],
  workspace: Workspace
): Promise<Id<'trips'>[]> {
  return await withSeedWrites(async () => {
    const tripIds: Id<'trips'>[] = [];
    await writeSeedWorkspaceTripAt({ ctx, plans, workspace, index: 0, tripIds });
    return tripIds;
  });
}

async function writeSeedWorkspaceTripAt({
  ctx,
  plans,
  workspace,
  index,
  tripIds
}: {
  ctx: MutationCtx;
  plans: SeedWorkspaceTripPlan[];
  workspace: Workspace;
  index: number;
  tripIds: Id<'trips'>[];
}): Promise<void> {
  const plan = plans[index];
  if (plan === undefined) return;
  tripIds.push(await writeSeedWorkspaceTrip(ctx, plan, workspace));
  await writeSeedWorkspaceTripAt({ ctx, plans, workspace, index: index + 1, tripIds });
}

async function writeSeedWorkspaceTrip(
  ctx: MutationCtx,
  plan: SeedWorkspaceTripPlan,
  workspace: Workspace
): Promise<Id<'trips'>> {
  const created = await createTrip(ctx, plan.create, true);
  const tripId = created.trip._id;
  const archived = created.trip.archive !== undefined;
  if (
    !archived &&
    (plan.activities.length > 0 || plan.additionalDestinations.length > 0 || plan.primary)
  ) {
    await writeSeedItinerary(
      ctx,
      {
        activities: plan.activities,
        additionalDestinations: plan.additionalDestinations,
        ...(plan.primary ? { primary: plan.primary } : {}),
        tripId
      },
      workspace
    );
  }
  const proposalPlan = plan.proposal;
  if (!archived && proposalPlan) {
    const proposals = await ctx.db
      .query('tripProposals')
      .withIndex('by_sourceTripId_and_updatedAt', (query) => query.eq('sourceTripId', tripId))
      .take(20);
    if (!proposals.some((proposal) => proposal.title === proposalPlan.title)) {
      const proposal = await TripVersions.create(ctx, tripId, { title: proposalPlan.title });
      const destinations = await TripDestination.forTrip(ctx, proposal.workingTripId);
      const destination = destinations[0];
      if (!destination) throw new ConvexError('Seed proposal destination was not cloned');
      await ItineraryActivity.add(ctx, proposal.workingTripId, destination._id, {
        notes: proposalPlan.notes,
        schedule: { day: destination.schedule?.startDay ?? 1, timeBlock: 'afternoon' },
        title: proposalPlan.title
      });
    }
  }
  if (plan.archived && created.trip.archive === undefined) {
    await archiveTrip(await loadTripContext(ctx, tripId, workspace));
  }
  await TripCover.ensureForTrip(ctx, tripId);
  return tripId;
}

export const write = internalWorkspaceMutation({
  args: seedWorkspaceTripArgs,
  returns: v.array(v.id('trips')),
  handler: async (ctx, { plans }) => await writeSeedWorkspaceTrips(ctx, plans, ctx.workspace)
});
