import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { everyHas } from '#convex/modules/travel/issues/rules/helpers';

/** Kept under its stored id: it used to ask that every item was ticked off. */
export const packingPacked = defineClauseKind({
  args: {},
  category: 'people',
  check: (_clause, { packing }) =>
    everyHas(packing, ({ brought, quantity }) => brought >= quantity, {
      missing: 'still need someone to bring them',
      none: 'No packing list yet'
    }),
  description: 'Every group item has enough people bringing it.',
  kind: 'packing_packed',
  label: () => 'Every group item has enough people bringing it',
  needs: ['packing'],
  title: 'Group items covered'
});
