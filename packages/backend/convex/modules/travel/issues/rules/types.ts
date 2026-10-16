import type { Infer } from 'convex/values';
import type { Doc } from '#convex-generated/dataModel';
import type { RuleValidators } from '#convex/modules/travel/issues/rules/schema';

/** Type-only imports, so the web rule builder can share every kind definition. */

export type IssueRule = Infer<typeof RuleValidators.rule>;
export type RuleClause = Infer<typeof RuleValidators.ruleClause>;
export type RuleGroup = Infer<typeof RuleValidators.ruleGroup>;
export type RuleItem = IssueRule['items'][number];
export type RuleMatch = Infer<typeof RuleValidators.match>;
export type RuleComparator = Infer<typeof RuleValidators.comparator>;
export type PresentedRule = Infer<typeof RuleValidators.presentedRule>;

export type ClauseKind = RuleClause['kind'];
export type ClauseOf<K extends ClauseKind> = Extract<RuleClause, { kind: K }>;

export type TransferFields = 'cost' | 'mode' | 'timing';

/** Everything a rule can read about the shared trip. */
export type RuleFacts = {
  activities: Array<
    Pick<
      Doc<'tripDestinationActivities'>,
      'address' | 'cost' | 'destinationId' | 'notes' | 'schedule' | 'title'
    >
  >;
  destinations: Array<Pick<Doc<'tripDestinations'>, '_id' | 'name' | 'position' | 'schedule'>>;
  packing: Array<Pick<Doc<'tripPackingItems'>, 'packed'>>;
  stays: Array<
    Pick<Doc<'tripDestinationStays'>, 'address' | 'cost' | 'destinationId' | 'notes' | 'schedule'>
  >;
  transfers: {
    activity: Array<Pick<Doc<'tripActivityTransfers'>, TransferFields>>;
    boundary: Array<Pick<Doc<'tripBoundaryTransfers'>, TransferFields | 'boundary'>>;
    destination: Array<
      Pick<
        Doc<'tripDestinationTransfers'>,
        TransferFields | 'fromDestinationId' | 'toDestinationId'
      >
    >;
  };
  /** RSVP per group member; a member who never answered counts as going. */
  travelers: Array<{ status: 'going' | 'maybe' | 'not_going' }>;
  trip: Pick<Doc<'trips'>, 'budget' | 'destination' | 'duration' | 'startDate'>;
};

/** The trip lists beyond the trip row; each costs a read, so it loads only when a clause needs it. */
export type FactList = Exclude<keyof RuleFacts, 'trip'>;

export type ClauseResult = { detail: string | null; met: boolean };

export const ruleCategories = {
  trip: 'Trip basics',
  money: 'Budget and costs',
  destinations: 'Destinations',
  activities: 'Activities',
  stays: 'Stays',
  transfers: 'Getting around',
  people: 'Travelers and packing'
} as const;

export type RuleCategory = keyof typeof ruleCategories;

/**
 * One clause kind, end to end. `create` is what the builder adds; `normalize` checks bounds and
 * trims text, throwing a readable error; `label` is the plain-English clause; `check` answers it
 * against the trip, reading only the lists named in `needs`.
 */
export type ClauseKindDefinition<K extends ClauseKind> = {
  category: RuleCategory;
  check: (clause: ClauseOf<K>, facts: RuleFacts) => ClauseResult;
  create: () => ClauseOf<K>;
  /** One line for the kind picker. */
  description: string;
  label: (clause: ClauseOf<K>) => string;
  needs: ReadonlyArray<FactList>;
  normalize: (clause: ClauseOf<K>) => ClauseOf<K>;
  /** The kind picker's name for it. */
  title: string;
};

/** A category file's definitions; the registry joins them and must cover every kind. */
export type ClauseKindDefinitions<K extends ClauseKind = ClauseKind> = {
  [P in K]: ClauseKindDefinition<P>;
};
