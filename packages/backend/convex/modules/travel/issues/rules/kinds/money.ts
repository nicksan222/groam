import {
  compare,
  comparatorWords,
  formatAmount,
  normalizeAmount
} from '#convex/modules/travel/issues/rules/helpers';
import type {
  ClauseKindDefinitions,
  FactList,
  RuleComparator,
  RuleFacts
} from '#convex/modules/travel/issues/rules/types';
import { plannedCostAmount } from '#convex/modules/travel/trips/costs';

const costLists = [
  'activities',
  'stays',
  'transfers',
  'travelers'
] as const satisfies ReadonlyArray<FactList>;

/** The trip's planned total, as the trip page sums it: per-person costs times who is going. */
export function plannedTotal(facts: RuleFacts): number {
  const going = facts.travelers.filter(({ status }) => status === 'going').length;
  return [
    ...facts.activities,
    ...facts.stays,
    ...facts.transfers.activity,
    ...facts.transfers.boundary,
    ...facts.transfers.destination
  ].reduce((total, item) => total + plannedCostAmount(item.cost, going), 0);
}

function amountWords(clause: { amount: number; comparator: RuleComparator }): string {
  return `${comparatorWords[clause.comparator]} ${formatAmount(clause.amount)}`;
}

function amountCompare(clause: { amount: number; comparator: RuleComparator }, value: number) {
  return compare({ comparator: clause.comparator, count: clause.amount }, value);
}

export const moneyKinds: ClauseKindDefinitions<'budget' | 'planned_cost' | 'within_budget'> = {
  budget: {
    category: 'money',
    check: (clause, { trip }) => {
      if (trip.budget === undefined) return { detail: 'No budget yet', met: false };
      const met = amountCompare(clause, trip.budget.amount);
      return { detail: met ? null : `Budget is ${formatAmount(trip.budget.amount)}`, met };
    },
    create: () => ({ amount: 1000, comparator: 'at_most', kind: 'budget' }),
    description: 'The group budget is set, within an amount.',
    label: (clause) => `The group budget is ${amountWords(clause)}`,
    needs: [],
    normalize: normalizeAmount,
    title: 'Group budget'
  },
  planned_cost: {
    category: 'money',
    check: (clause, facts) => {
      const total = plannedTotal(facts);
      const met = amountCompare(clause, total);
      return { detail: met ? null : `${formatAmount(total)} planned`, met };
    },
    create: () => ({ amount: 1000, comparator: 'at_most', kind: 'planned_cost' }),
    description: 'Activities, stays, and transfers add up to an amount.',
    label: (clause) => `Planned costs total ${amountWords(clause)}`,
    needs: costLists,
    normalize: normalizeAmount,
    title: 'Planned costs'
  },
  within_budget: {
    category: 'money',
    check: (_clause, facts) => {
      const budget = facts.trip.budget?.amount;
      if (budget === undefined) return { detail: 'No budget yet', met: false };
      const total = plannedTotal(facts);
      const met = total <= budget;
      return { detail: met ? null : `${formatAmount(total)} of ${formatAmount(budget)}`, met };
    },
    create: () => ({ kind: 'within_budget' }),
    description: 'Planned costs fit inside the group budget.',
    label: () => 'Planned costs fit within the group budget',
    needs: costLists,
    normalize: () => ({ kind: 'within_budget' }),
    title: 'Within budget'
  }
};
