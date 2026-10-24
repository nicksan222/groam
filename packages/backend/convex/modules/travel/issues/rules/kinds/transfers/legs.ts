import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { everyHas } from '#convex/modules/travel/issues/rules/helpers';

export const legsCovered = defineClauseKind({
  args: {},
  category: 'transfers',
  check: (_clause, { destinations, transfers }) => {
    const route = destinations.toSorted((left, right) => left.position - right.position);
    const legs = route.slice(1).map((to, index) => ({ from: route[index], to }));
    return everyHas(
      legs,
      ({ from, to }) =>
        transfers.destination.some(
          (transfer) =>
            transfer.fromDestinationId === from?._id && transfer.toDestinationId === to._id
        ),
      { missing: 'legs without a transfer', none: 'Needs two destinations' }
    );
  },
  description: 'Every move between destinations has a transfer.',
  kind: 'legs_covered',
  label: () => 'Every leg between destinations has a transfer',
  needs: ['destinations', 'transfers'],
  title: 'Every leg has a transfer'
});
