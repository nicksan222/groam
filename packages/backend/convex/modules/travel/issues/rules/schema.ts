import { v } from 'convex/values';
import { TRIP_TIME_BLOCKS } from '#convex/modules/travel/activities/timeblocks';
import { TripTransferValidators } from '#convex/modules/travel/transfers/schema';

/**
 * Validators for composed "done when" rules. Each clause kind is one object here; its wording,
 * defaults, normalizing, and check live in `kinds/`, and the mapped types there make every kind
 * implement all of them. Add a kind by adding its object to `ruleClause` below.
 */

const comparator = v.union(v.literal('at_least'), v.literal('at_most'), v.literal('exactly'));
/** Every item holds, at least one does, or none does. */
const match = v.union(v.literal('all'), v.literal('any'), v.literal('none'));
/** Trip days, inclusive. Omitted on a clause: the whole trip. */
const dayRange = v.object({ from: v.number(), to: v.number() });
const counted = { comparator, count: v.number() };
/** The fixed starter checks; see `checks.ts`. */
const tripCheck = v.union(
  v.literal('destination'),
  v.literal('dates'),
  v.literal('duration'),
  v.literal('stays'),
  v.literal('budget'),
  v.literal('packing'),
  v.literal('activities')
);
const timeBlock = v.union(
  v.literal(TRIP_TIME_BLOCKS[0]),
  v.literal(TRIP_TIME_BLOCKS[1]),
  v.literal(TRIP_TIME_BLOCKS[2]),
  v.literal(TRIP_TIME_BLOCKS[3])
);

const ruleClause = v.union(
  // Trip basics
  v.object({ check: tripCheck, kind: v.literal('trip') }),
  v.object({ ...counted, kind: v.literal('trip_length') }),
  /** ISO dates (YYYY-MM-DD), inclusive; at least one bound. */
  v.object({
    from: v.optional(v.string()),
    kind: v.literal('start_date'),
    to: v.optional(v.string())
  }),
  // Budget and costs, in the trip currency
  v.object({ amount: v.number(), comparator, kind: v.literal('budget') }),
  v.object({ amount: v.number(), comparator, kind: v.literal('planned_cost') }),
  v.object({ kind: v.literal('within_budget') }),
  // Destinations
  v.object({ ...counted, kind: v.literal('destinations') }),
  v.object({ kind: v.literal('destination_named'), text: v.string() }),
  v.object({ kind: v.literal('destinations_scheduled') }),
  v.object({ kind: v.literal('days_assigned') }),
  // Activities
  v.object({
    ...counted,
    days: v.optional(dayRange),
    kind: v.literal('activities'),
    /** `day`: every day in range must pass on its own. `total`: the range's sum must pass. */
    per: v.union(v.literal('day'), v.literal('total')),
    timeBlock: v.optional(timeBlock),
    /** Case-insensitive part of the activity title, such as "dinner". */
    titleIncludes: v.optional(v.string())
  }),
  v.object({ ...counted, days: v.optional(dayRange), kind: v.literal('free_days') }),
  v.object({
    field: v.union(
      v.literal('cost'),
      v.literal('start_time'),
      v.literal('address'),
      v.literal('notes')
    ),
    kind: v.literal('activities_detailed')
  }),
  v.object({ days: v.optional(dayRange), kind: v.literal('no_time_conflicts') }),
  v.object({ ...counted, kind: v.literal('activities_per_destination') }),
  // Stays
  v.object({ ...counted, kind: v.literal('stays') }),
  /** Trip nights, inclusive; night `n` is the night after day `n`. */
  v.object({ kind: v.literal('nights_covered'), nights: v.optional(dayRange) }),
  v.object({
    field: v.union(v.literal('cost'), v.literal('address'), v.literal('notes')),
    kind: v.literal('stays_detailed')
  }),
  v.object({ kind: v.literal('stays_per_destination') }),
  // Getting around
  v.object({
    boundary: v.union(v.literal('arrival'), v.literal('departure'), v.literal('both')),
    kind: v.literal('boundary_transfer'),
    mode: v.optional(TripTransferValidators.mode)
  }),
  v.object({ kind: v.literal('legs_covered') }),
  v.object({
    field: v.union(v.literal('cost'), v.literal('timing')),
    kind: v.literal('transfers_detailed')
  }),
  // Travelers and packing
  v.object({
    ...counted,
    kind: v.literal('travelers'),
    status: v.union(v.literal('going'), v.literal('maybe'), v.literal('not_going'))
  }),
  v.object({ ...counted, kind: v.literal('packing_items') }),
  v.object({ kind: v.literal('packing_packed') })
);

const ruleGroup = v.object({ clauses: v.array(ruleClause), kind: v.literal('group'), match });

/** A person's composed "done when": clauses and one level of grouped clauses. */
const rule = v.object({ items: v.array(v.union(ruleClause, ruleGroup)), match });

/** One checked clause; `detail` says what is missing, such as "Day 2 has 1". */
const presentedClause = v.object({
  detail: v.union(v.string(), v.null()),
  label: v.string(),
  met: v.boolean()
});

const presentedRule = v.object({
  items: v.array(
    v.union(
      presentedClause.extend({ kind: v.literal('clause') }),
      v.object({
        clauses: v.array(presentedClause),
        kind: v.literal('group'),
        label: v.string(),
        match,
        met: v.boolean()
      })
    )
  ),
  kind: v.literal('rule'),
  label: v.string(),
  match,
  met: v.boolean(),
  /** What a person gets told when they try to close it unmet or reopen it met. */
  refusal: v.string(),
  rule
});

export const RuleValidators = {
  comparator,
  match,
  presentedRule,
  rule,
  ruleClause,
  ruleGroup,
  tripCheck
};
