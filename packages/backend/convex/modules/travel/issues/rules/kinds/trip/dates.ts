import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { presence } from '#convex/modules/travel/issues/rules/helpers';

export const hasDates = defineClauseKind({
  args: {},
  category: 'trip',
  check: (_clause, { trip }) => presence(trip.startDate !== undefined, 'No start date yet'),
  description: 'The trip has a start date. Free-text date notes do not count.',
  kind: 'has_dates',
  label: () => 'The trip has travel dates',
  needs: [],
  title: 'Dates are set'
});
