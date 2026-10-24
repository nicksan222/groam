import type { Doc } from '#convex-generated/dataModel';
import {
  type ClauseKind,
  createClause,
  type IssueRule
} from '#convex/modules/travel/issues/rules/index';

/** A starter's rule: one clause kind, checked like any rule a person builds. */
function only(kind: ClauseKind): IssueRule {
  return { items: [createClause(kind)], match: 'all' };
}

export type StarterIssue = {
  body: (trip: Doc<'trips'>) => string;
  rule: IssueRule;
  /** Counts toward the board's mandatory progress. The rest are reminders of what to fill in. */
  mandatory: boolean;
  title: string;
};

/**
 * The decisions every new shared trip starts with, in display order: the mandatory ones, then
 * the parts of the plan still to fill in. Each closes itself once the trip meets its rule.
 */
export const STARTER_ISSUES: readonly StarterIssue[] = [
  {
    body: () =>
      'Pick where the trip goes first. Start an idea from this issue to propose a place; applying the idea closes it.',
    rule: only('has_destination'),
    mandatory: true,
    title: 'Choose where to go'
  },
  {
    body: (trip) => {
      const dateNotes = trip.dateNotes?.trim();
      return `Settle on an exact start date so everyone can plan around it.${dateNotes ? ` So far: “${dateNotes}”.` : ''}`;
    },
    rule: only('has_dates'),
    mandatory: true,
    title: 'Agree on the travel dates'
  },
  {
    body: () => 'Agree on how many days the trip lasts, so the group can plan each day.',
    rule: only('has_length'),
    mandatory: true,
    title: 'Decide how many days'
  },
  {
    body: () => 'Find and book somewhere to stay for every night of the trip.',
    rule: only('nights_covered'),
    mandatory: true,
    title: 'Book places to stay'
  },
  {
    body: () => 'Plan at least one thing to do in every destination.',
    rule: only('destination_activities'),
    mandatory: false,
    title: 'Plan something in every destination'
  },
  {
    body: () => 'Agree on a total group budget, so planned costs have something to fit within.',
    rule: only('has_budget'),
    mandatory: false,
    title: 'Set a group budget'
  },
  {
    body: () => 'List what to bring, so nobody leaves without the essentials.',
    rule: only('packing_listed'),
    mandatory: false,
    title: 'Write the packing list'
  }
];
