import type { Doc } from '#convex-generated/dataModel';
import type { ConditionCheck } from '#convex/modules/travel/issues/condition';

export type StarterIssue = {
  body: (trip: Doc<'trips'>) => string;
  check: ConditionCheck;
  /** Counts toward the board's mandatory progress. The rest are reminders of what to fill in. */
  mandatory: boolean;
  title: string;
};

/**
 * The decisions every new shared trip starts with, in display order: the mandatory ones, then
 * the parts of the plan still to fill in. Each closes itself once the trip satisfies its check.
 */
export const STARTER_ISSUES: readonly StarterIssue[] = [
  {
    body: () =>
      'Pick where the trip goes first. Start an idea from this issue to propose a place; applying the idea closes it.',
    check: 'destination',
    mandatory: true,
    title: 'Choose where to go'
  },
  {
    body: (trip) => {
      const dateNotes = trip.dateNotes?.trim();
      return `Settle on an exact start date so everyone can plan around it.${dateNotes ? ` So far: “${dateNotes}”.` : ''}`;
    },
    check: 'dates',
    mandatory: true,
    title: 'Agree on the travel dates'
  },
  {
    body: () => 'Agree on how many days the trip lasts, so the group can plan each day.',
    check: 'duration',
    mandatory: true,
    title: 'Decide how many days'
  },
  {
    body: () => 'Find and book somewhere to stay for every night of the trip.',
    check: 'stays',
    mandatory: true,
    title: 'Book places to stay'
  },
  {
    body: () => 'Plan at least one thing to do in every destination.',
    check: 'activities',
    mandatory: false,
    title: 'Plan something in every destination'
  },
  {
    body: () => 'Agree on a total group budget, so planned costs have something to fit within.',
    check: 'budget',
    mandatory: false,
    title: 'Set a group budget'
  },
  {
    body: () => 'List what to bring, so nobody leaves without the essentials.',
    check: 'packing',
    mandatory: false,
    title: 'Write the packing list'
  }
];
