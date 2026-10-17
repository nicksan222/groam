import type { GenericId, Infer } from 'convex/values';
import type { tripActivityTables } from '#convex/modules/travel/activities/schema';
import type { tripDestinationTables } from '#convex/modules/travel/destinations/schema';
import type { RuleValidators } from '#convex/modules/travel/issues/rules/schema';
import type { tripStayTables } from '#convex/modules/travel/stays/schema';
import type { tripTransferTables } from '#convex/modules/travel/transfers/schema';
import type { tripTables } from '#convex/modules/travel/trips/schema';

/** Type-only imports, so the web rule builder can share every kind definition. */

export type IssueRule = Infer<typeof RuleValidators.rule>;
export type RuleClause = Infer<typeof RuleValidators.ruleClause>;
export type RuleGroup = Infer<typeof RuleValidators.ruleGroup>;
export type RuleItem = IssueRule['items'][number];
export type RuleMatch = Infer<typeof RuleValidators.match>;
export type PresentedRule = Infer<typeof RuleValidators.presentedRule>;

export type ClauseKind = RuleClause['kind'];
export type ClauseOf<K extends ClauseKind> = Extract<RuleClause, { kind: K }>;

/**
 * Everything a rule can read about the shared trip. Rows are typed from their table validators
 * rather than the generated data model: the rule validator is part of the schema, so kinds typed
 * against `Doc` would be circular.
 */
export type RuleFacts = {
  activities: Array<
    Pick<
      (typeof tripActivityTables)['tripDestinationActivities']['validator']['type'],
      'address' | 'cost' | 'destinationId' | 'notes' | 'schedule' | 'title'
    >
  >;
  destinations: Array<
    Pick<
      (typeof tripDestinationTables)['tripDestinations']['validator']['type'],
      'name' | 'position' | 'schedule'
    > & { _id: GenericId<'tripDestinations'> }
  >;
  /** One entry per group item: how many are needed and how many travelers are bringing. */
  packing: Array<{ brought: number; quantity: number }>;
  stays: Array<
    Pick<
      (typeof tripStayTables)['tripDestinationStays']['validator']['type'],
      'address' | 'cost' | 'destinationId' | 'notes' | 'schedule'
    >
  >;
  transfers: {
    activity: Array<
      Pick<
        (typeof tripTransferTables)['tripActivityTransfers']['validator']['type'],
        'cost' | 'mode' | 'timing'
      >
    >;
    boundary: Array<
      Pick<
        (typeof tripTransferTables)['tripBoundaryTransfers']['validator']['type'],
        'boundary' | 'cost' | 'mode' | 'timing'
      >
    >;
    destination: Array<
      Pick<
        (typeof tripTransferTables)['tripDestinationTransfers']['validator']['type'],
        'cost' | 'fromDestinationId' | 'mode' | 'timing' | 'toDestinationId'
      >
    >;
  };
  /** RSVP per group member; a member who never answered counts as going. */
  travelers: Array<{ status: 'going' | 'maybe' | 'not_going' }>;
  trip: Pick<
    (typeof tripTables)['trips']['validator']['type'],
    'budget' | 'destination' | 'duration' | 'startDate'
  >;
};

/** The trip lists beyond the trip row; each costs a read, so it loads only when a clause needs it. */
export type FactList = Exclude<keyof RuleFacts, 'trip'>;

export type ClauseResult = { detail: string | null; met: boolean };

export const ruleCategories = {
  trip: 'Dates and budget',
  destinations: 'Route',
  activities: 'Activities',
  stays: 'Stays',
  transfers: 'Getting around',
  people: 'Travelers and packing'
} as const;

export type RuleCategory = keyof typeof ruleCategories;

/**
 * One setting a person tunes in the builder, in the order the sentence reads. `lead` is the word
 * before it ("at least", "with"). The builder and the AI drafter both render from this, so a new
 * kind needs no editor code.
 */
export type ClauseField<Key extends string = string> = {
  key: Key;
  /** Names the input for screen readers. */
  label: string;
  lead?: string;
} & (
  | { type: 'number' }
  | { optional?: true; placeholder: string; type: 'text' }
  | {
      /** Labels the choice that leaves an optional setting unset, such as "any way". */
      any?: string;
      /** Stored value to its wording in the picker. */
      options: Readonly<Record<string, string>>;
      type: 'choice';
    }
);

/** One clause kind as the engine sees it; see `define.ts`. */
export type ClauseKindDefinition<K extends ClauseKind = ClauseKind> = {
  category: RuleCategory;
  check: (clause: ClauseOf<K>, facts: RuleFacts) => ClauseResult;
  create: () => ClauseOf<K>;
  description: string;
  fields: ReadonlyArray<ClauseField>;
  kind: K;
  label: (clause: ClauseOf<K>) => string;
  needs: ReadonlyArray<FactList>;
  normalize: (clause: ClauseOf<K>) => ClauseOf<K>;
  title: string;
};
