import { v } from 'convex/values';
import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import {
  type DetailWording,
  detailField,
  everyHas,
  filled
} from '#convex/modules/travel/issues/rules/helpers';

const detail = v.union(v.literal('start_time'), v.literal('cost'), v.literal('address'));
type Detail = typeof detail.type;

const wording: DetailWording<Detail> = {
  address: { has: 'an address', missing: 'without an address' },
  cost: { has: 'a cost', missing: 'without a cost' },
  start_time: { has: 'a start time', missing: 'without a start time' }
};

export const activitiesDetailed = defineClauseKind({
  args: { field: detail },
  category: 'activities',
  check: ({ field }, { activities }) =>
    everyHas(
      activities,
      (activity) => {
        switch (field) {
          case 'address': {
            return filled(activity.address);
          }
          case 'cost': {
            return activity.cost !== undefined;
          }
          case 'start_time': {
            return filled(activity.schedule.startTime);
          }
        }
      },
      { missing: wording[field].missing, none: 'No activities yet' }
    ),
  create: () => ({ field: 'start_time' as const }),
  description: 'Every activity has its start time, cost, or address filled in.',
  fields: [detailField(wording)],
  kind: 'activities_detailed',
  label: ({ field }) => `Every activity has ${wording[field].has}`,
  needs: ['activities'],
  title: 'Activities filled in'
});
