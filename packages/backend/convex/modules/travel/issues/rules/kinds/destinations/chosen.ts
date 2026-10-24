import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { presence } from '#convex/modules/travel/issues/rules/helpers';

export const hasDestination = defineClauseKind({
  args: {},
  category: 'destinations',
  check: (_clause, { trip }) => presence(trip.destination.status === 'known', 'No destination yet'),
  description: 'The group picked where the trip goes.',
  kind: 'has_destination',
  label: () => 'The trip has a destination',
  needs: [],
  title: 'Destination is set'
});
