import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { everyHas } from '#convex/modules/travel/issues/rules/helpers';

export const packingPacked = defineClauseKind({
  args: {},
  category: 'people',
  check: (_clause, { packing }) =>
    everyHas(packing, ({ packed }) => packed, {
      missing: 'still to pack',
      none: 'No packing list yet'
    }),
  description: 'Every item on the packing list is ticked.',
  kind: 'packing_packed',
  label: () => 'Everything on the packing list is packed',
  needs: ['packing'],
  title: 'Everything packed'
});
