import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { presence, tripDays } from '#convex/modules/travel/issues/rules/helpers';

export const hasLength = defineClauseKind({
  args: {},
  category: 'trip',
  check: (_clause, facts) => presence(tripDays(facts) !== undefined, 'No length yet'),
  description: 'The group agreed how many days the trip lasts.',
  kind: 'has_length',
  label: () => 'The trip has a length',
  needs: [],
  title: 'Length is set'
});
