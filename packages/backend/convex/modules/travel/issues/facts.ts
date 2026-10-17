import { ConvexError } from 'convex/values';
import type { Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import { workspaceRoster } from '#convex/modules/auth/workspace';
import type { ConditionedIssue } from '#convex/modules/travel/issues/condition';
import {
  emptyRuleFacts,
  type FactList,
  type RuleFacts,
  ruleNeeds
} from '#convex/modules/travel/issues/rules/index';
import { MAX_PACKING_ITEMS } from '#convex/modules/travel/packing/schema';
import { MAX_STAYS_PER_TRIP } from '#convex/modules/travel/stays/schema';
import type { TripCtx } from '#convex/modules/travel/trips/ctx';

/**
 * The caps the itinerary and traveler modules enforce on write. Importing those modules here
 * would cycle through `trips/ctx`, so the numbers are mirrored.
 */
const MAX_ACTIVITIES_PER_TRIP = 200; // ItineraryActivity.MAX_PER_TRIP
const MAX_DESTINATIONS_PER_TRIP = 20; // TripDestination.MAX_PER_TRIP
const MAX_ACTIVITY_TRANSFERS = 199;
const MAX_DESTINATION_TRANSFERS = 19;
const MAX_TRAVELERS = 100;

export type Issue = Pick<ConditionedIssue, 'condition'>;

/** Which trip lists the given issues' rules read. */
function factNeeds(issues: Array<Issue>): Set<FactList> {
  return new Set(
    issues.flatMap(({ condition }) =>
      condition?.kind === 'rule' ? [...ruleNeeds(condition.rule)] : []
    )
  );
}

function capped<T>(rows: Array<T>, maximum: number, what: string): Array<T> {
  if (rows.length > maximum) throw new ConvexError(`Trips support up to ${maximum} ${what}`);
  return rows;
}

/** Reads one row past the cap so an over-full list is refused instead of silently truncated. */
async function takeCapped<T>(
  query: { take: (count: number) => Promise<Array<T>> },
  maximum: number,
  what: string
): Promise<Array<T>> {
  return capped(await query.take(maximum + 1), maximum, what);
}

const loaders = {
  activities: async (ctx: Pick<QueryCtx, 'db'>, tripId: Id<'trips'>) =>
    takeCapped(
      ctx.db
        .query('tripDestinationActivities')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId)),
      MAX_ACTIVITIES_PER_TRIP,
      'itinerary activities'
    ),
  destinations: async (ctx: Pick<QueryCtx, 'db'>, tripId: Id<'trips'>) =>
    takeCapped(
      ctx.db
        .query('tripDestinations')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId)),
      MAX_DESTINATIONS_PER_TRIP,
      'destinations'
    ),
  packing: async (ctx: Pick<QueryCtx, 'db'>, tripId: Id<'trips'>) =>
    takeCapped(
      ctx.db
        .query('tripPackingItems')
        .withIndex('by_tripId_and_sortOrder', (query) => query.eq('tripId', tripId)),
      MAX_PACKING_ITEMS,
      'packing items'
    ),
  stays: async (ctx: Pick<QueryCtx, 'db'>, tripId: Id<'trips'>) =>
    takeCapped(
      ctx.db
        .query('tripDestinationStays')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId)),
      MAX_STAYS_PER_TRIP,
      'stays'
    ),
  transfers: async (ctx: Pick<QueryCtx, 'db'>, tripId: Id<'trips'>) => {
    const [activity, boundary, destination] = await Promise.all([
      ctx.db
        .query('tripActivityTransfers')
        .withIndex('by_tripId_and_fromActivityId', (query) => query.eq('tripId', tripId))
        .take(MAX_ACTIVITY_TRANSFERS + 1),
      ctx.db
        .query('tripBoundaryTransfers')
        .withIndex('by_tripId_and_boundary', (query) => query.eq('tripId', tripId))
        .take(3),
      ctx.db
        .query('tripDestinationTransfers')
        .withIndex('by_tripId_and_fromDestinationId', (query) => query.eq('tripId', tripId))
        .take(MAX_DESTINATION_TRANSFERS + 1)
    ]);
    return {
      activity: capped(activity, MAX_ACTIVITY_TRANSFERS, 'activity transfers'),
      boundary,
      destination: capped(destination, MAX_DESTINATION_TRANSFERS, 'destination transfers')
    };
  }
} satisfies { [L in Exclude<FactList, 'travelers'>]: (...args: never) => Promise<RuleFacts[L]> };

/** One RSVP per group member, as the travelers module presents them: no answer means going. */
async function loadTravelers(trip: TripCtx): Promise<RuleFacts['travelers']> {
  const [rows, roster] = await Promise.all([
    trip.db
      .query('tripTravelers')
      .withIndex('by_tripId', (query) => query.eq('tripId', trip.trip._id))
      .take(MAX_TRAVELERS + 1),
    workspaceRoster(trip, trip.workspace)
  ]);
  const byUserId = new Map(
    capped(rows, MAX_TRAVELERS, 'travelers').map((row) => [row.userId, row])
  );
  return roster.members.map(({ userId }) => {
    const status = byUserId.get(userId)?.status;
    return { status: status === 'maybe' || status === 'not_going' ? status : 'going' };
  });
}

/** Each trip list costs a read, so it loads only when some issue's condition reads it. */
export async function loadConditionFacts(trip: TripCtx, issues: Array<Issue>): Promise<RuleFacts> {
  const needs = factNeeds(issues);
  const tripId = trip.trip._id;
  const empty = emptyRuleFacts(trip.trip);
  const [activities, destinations, packing, stays, transfers, travelers] = await Promise.all([
    needs.has('activities') ? loaders.activities(trip, tripId) : empty.activities,
    needs.has('destinations') ? loaders.destinations(trip, tripId) : empty.destinations,
    needs.has('packing') ? loaders.packing(trip, tripId) : empty.packing,
    needs.has('stays') ? loaders.stays(trip, tripId) : empty.stays,
    needs.has('transfers') ? loaders.transfers(trip, tripId) : empty.transfers,
    needs.has('travelers') ? loadTravelers(trip) : empty.travelers
  ]);
  return { activities, destinations, packing, stays, transfers, travelers, trip: trip.trip };
}
