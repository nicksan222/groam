import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { presence } from '#convex/modules/travel/issues/rules/helpers';

export const hasBudget = defineClauseKind({
  args: {},
  category: 'trip',
  check: (_clause, { trip }) => presence(trip.budget !== undefined, 'No budget yet'),
  description: 'The group agreed on a budget.',
  kind: 'has_budget',
  label: () => 'The trip has a group budget',
  needs: [],
  title: 'Budget is set'
});
