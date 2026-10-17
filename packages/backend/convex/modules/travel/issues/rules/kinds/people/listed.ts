import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { presence } from '#convex/modules/travel/issues/rules/helpers';

export const packingListed = defineClauseKind({
  args: {},
  category: 'people',
  check: (_clause, { packing }) => presence(packing.length > 0, 'No packing list yet'),
  description: 'The packing list has at least one item.',
  kind: 'packing_listed',
  label: () => 'The packing list has items',
  needs: ['packing'],
  title: 'Packing list started'
});
