import { v } from 'convex/values';
import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import {
  type DetailWording,
  detailField,
  everyHas,
  filled
} from '#convex/modules/travel/issues/rules/helpers';

const detail = v.union(v.literal('cost'), v.literal('address'));
type Detail = typeof detail.type;

const wording: DetailWording<Detail> = {
  address: { has: 'an address', missing: 'without an address' },
  cost: { has: 'a cost', missing: 'without a cost' }
};

export const staysDetailed = defineClauseKind({
  args: { field: detail },
  category: 'stays',
  check: ({ field }, { stays }) =>
    everyHas(stays, (stay) => (field === 'cost' ? stay.cost !== undefined : filled(stay.address)), {
      missing: wording[field].missing,
      none: 'No stays yet'
    }),
  create: () => ({ field: 'address' as const }),
  description: 'Every stay has its cost or address filled in.',
  fields: [detailField(wording)],
  kind: 'stays_detailed',
  label: ({ field }) => `Every stay has ${wording[field].has}`,
  needs: ['stays'],
  title: 'Stays filled in'
});
