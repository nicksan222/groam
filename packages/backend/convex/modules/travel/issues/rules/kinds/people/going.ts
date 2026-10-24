import { v } from 'convex/values';
import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { MAX_RULE_COUNT, presence, wholeNumber } from '#convex/modules/travel/issues/rules/helpers';

export const travelersGoing = defineClauseKind({
  args: { count: v.number() },
  category: 'people',
  check: ({ count }, { travelers }) => {
    const going = travelers.filter(({ status }) => status === 'going').length;
    return presence(going >= count, `${going} going so far`);
  },
  create: () => ({ count: 2 }),
  description: 'Enough of the group said they are going.',
  fields: [{ key: 'count', label: 'Travelers going', lead: 'at least', type: 'number' }],
  kind: 'travelers_going',
  label: ({ count }) => `At least ${count} ${count === 1 ? 'traveler is' : 'travelers are'} going`,
  needs: ['travelers'],
  normalize: ({ count }) => ({
    count: wholeNumber(count, 1, MAX_RULE_COUNT, 'Traveler count')
  }),
  title: 'Travelers going'
});
