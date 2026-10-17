import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { formatAmount, presence, unmet } from '#convex/modules/travel/issues/rules/helpers';
import type { RuleFacts } from '#convex/modules/travel/issues/rules/types';
import { plannedCostAmount } from '#convex/modules/travel/trips/costs';

/** The trip's planned total, as the trip page sums it: per-person costs times who is going. */
function plannedTotal(facts: RuleFacts): number {
  const going = facts.travelers.filter(({ status }) => status === 'going').length;
  return [
    ...facts.activities,
    ...facts.stays,
    ...facts.transfers.activity,
    ...facts.transfers.boundary,
    ...facts.transfers.destination
  ].reduce((total, item) => total + plannedCostAmount(item.cost, going), 0);
}

export const withinBudget = defineClauseKind({
  args: {},
  category: 'trip',
  check: (_clause, facts) => {
    const budget = facts.trip.budget?.amount;
    if (budget === undefined) return unmet('No budget yet');
    const total = plannedTotal(facts);
    return presence(total <= budget, `${formatAmount(total)} of ${formatAmount(budget)}`);
  },
  description: 'Activities, stays, and transfers add up to no more than the budget.',
  kind: 'within_budget',
  label: () => 'Planned costs fit within the group budget',
  needs: ['activities', 'stays', 'transfers', 'travelers'],
  title: 'Within budget'
});
