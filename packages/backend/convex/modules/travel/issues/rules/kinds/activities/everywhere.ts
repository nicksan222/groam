import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { everyHas } from '#convex/modules/travel/issues/rules/helpers';

export const destinationActivities = defineClauseKind({
  args: {},
  category: 'activities',
  check: (_clause, { activities, destinations }) =>
    everyHas(
      destinations,
      ({ _id }) => activities.some(({ destinationId }) => destinationId === _id),
      { missing: 'without an activity', none: 'No destinations yet' }
    ),
  description: 'Each stop on the route has at least one thing to do.',
  kind: 'destination_activities',
  label: () => 'Every destination has an activity',
  needs: ['activities', 'destinations'],
  title: 'Something in every place'
});
