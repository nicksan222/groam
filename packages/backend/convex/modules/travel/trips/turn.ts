import { type Infer, v } from 'convex/values';
import type { Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import { Polls } from '#convex/modules/polls/index';
import { TripIssues } from '#convex/modules/travel/issues/index';
import { TripIssueValidators } from '#convex/modules/travel/issues/schema';
import { loadTripContext } from '#convex/modules/travel/trips/ctx';
import { listTrips } from '#convex/modules/travel/trips/list';
import { isIdeaYourTurn } from '#convex/modules/travel/turn';
import { TripVersions } from '#convex/modules/travel/versions/index';
import { TripVersionValidators } from '#convex/modules/travel/versions/schema';

/** Trips whose queues Home reads; favorites come first, so the rest wait behind them. */
const MAX_TURN_TRIPS = 12;
/** Rows Home lists; `total` says how many more wait. */
const MAX_TURN_ITEMS = 20;
/** How many trips to look at to find `MAX_TURN_TRIPS` the viewer holds a seat on (a list page). */
const TRIP_SCAN = 25;

const base = {
  dueAt: v.union(v.number(), v.null()),
  tripId: v.id('trips'),
  tripName: v.string(),
  tripShortId: v.union(v.string(), v.null()),
  updatedAt: v.number()
};

const turnItem = v.union(
  v.object({
    ...base,
    id: v.id('tripIssues'),
    kind: v.literal('issue'),
    mandatory: v.boolean(),
    status: TripIssueValidators.status,
    title: v.string()
  }),
  v.object({
    ...base,
    authorUserId: v.string(),
    id: v.id('tripProposals'),
    kind: v.literal('idea'),
    status: TripVersionValidators.status,
    title: v.string(),
    workingTripId: v.id('trips')
  }),
  v.object({
    ...base,
    id: v.id('polls'),
    kind: v.literal('poll'),
    title: v.string()
  })
);

export const TripTurnValidators = {
  result: v.object({
    /** How many trips were read, at most `MAX_TURN_TRIPS`. */
    checked: v.number(),
    items: v.array(turnItem),
    total: v.number(),
    /** More trips than were read: "nothing waiting" then only speaks for the ones that were. */
    truncated: v.boolean(),
    trips: v.array(
      v.object({
        ideas: v.number(),
        issues: v.number(),
        polls: v.number(),
        tripId: v.id('trips')
      })
    )
  })
};

type TurnItem = Infer<typeof turnItem>;

/** Dated before undated and soonest first; then the most recently touched. */
function compareTurnItems(left: TurnItem, right: TurnItem) {
  if ((left.dueAt === null) !== (right.dueAt === null)) return left.dueAt === null ? 1 : -1;
  if (left.dueAt !== null && right.dueAt !== null && left.dueAt !== right.dueAt) {
    return left.dueAt - right.dueAt;
  }
  return right.updatedAt - left.updatedAt;
}

/**
 * The trips Home reads: listed (so not archived and never a working copy), seated, favorites
 * first. `truncated` is true when more trips exist than were read.
 */
async function turnTrips(ctx: QueryCtx) {
  const { isDone, page } = await listTrips(
    ctx,
    { cursor: null, numItems: TRIP_SCAN },
    { includeArchived: false }
  );
  const seated = page.filter((trip) => trip.canParticipate);
  return {
    tripIds: seated.slice(0, MAX_TURN_TRIPS).map((trip) => trip.id),
    truncated: !isDone || seated.length > MAX_TURN_TRIPS
  };
}

/**
 * What waits on the viewer in one trip. The trip is loaded once and passed down; each kind reads
 * only the rows that can wait on the viewer (no itinerary facts, tallies or condition reads), so
 * Home's cost per trip does not grow with the plan.
 */
async function turnForTrip(ctx: QueryCtx, tripId: Id<'trips'>) {
  const trip = await loadTripContext(ctx, tripId);
  const viewerUserId = trip.workspace.userId;
  const tripFields = {
    tripId,
    tripName: trip.trip.name,
    tripShortId: trip.trip.shortId ?? null
  };
  const [issues, ideas, polls] = await Promise.all([
    TripIssues.listTurn(ctx, tripId, viewerUserId),
    TripVersions.listTurn(trip),
    Polls.listTurnForTrip(ctx, trip.workspace, trip.trip)
  ]);
  const items: TurnItem[] = [
    ...issues.map((issue) => ({
      ...tripFields,
      dueAt: issue.dueAt ?? null,
      id: issue._id,
      kind: 'issue' as const,
      mandatory: issue.labels.includes('mandatory'),
      status: issue.status,
      title: issue.title,
      updatedAt: issue.updatedAt
    })),
    ...ideas
      .filter((idea) => isIdeaYourTurn(idea, viewerUserId))
      .map((idea) => ({
        ...tripFields,
        authorUserId: idea.author.userId,
        dueAt: null,
        id: idea.id,
        kind: 'idea' as const,
        status: idea.status,
        title: idea.title,
        updatedAt: idea.updatedAt,
        workingTripId: idea.workingTripId
      })),
    ...polls.map((poll) => ({
      ...tripFields,
      dueAt: poll.closesAt,
      id: poll.id,
      kind: 'poll' as const,
      title: poll.question,
      updatedAt: poll.updatedAt
    }))
  ];
  return items;
}

/**
 * What waits on the viewer across their trips: per-trip counts and one list, soonest due first.
 * Archived trips and trips without a seat contribute nothing. It applies the same turn rules as
 * the trip sidebar (`modules/travel/turn`) over leaner reads.
 */
export async function listTurn(ctx: QueryCtx): Promise<Infer<typeof TripTurnValidators.result>> {
  const { tripIds, truncated } = await turnTrips(ctx);
  const perTrip = await Promise.all(tripIds.map((tripId) => turnForTrip(ctx, tripId)));
  const all = perTrip.flat().toSorted(compareTurnItems);
  return {
    checked: tripIds.length,
    items: all.slice(0, MAX_TURN_ITEMS),
    total: all.length,
    trips: tripIds.map((tripId, index) => {
      const items = perTrip[index] ?? [];
      const count = (kind: TurnItem['kind']) => items.filter((item) => item.kind === kind).length;
      return { ideas: count('idea'), issues: count('issue'), polls: count('poll'), tripId };
    }),
    truncated
  };
}
