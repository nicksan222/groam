import {
  counted,
  everyHas,
  normalizeCount,
  quantity
} from '#convex/modules/travel/issues/rules/helpers';
import type { ClauseKindDefinitions, ClauseOf } from '#convex/modules/travel/issues/rules/types';

export type TravelerStatus = ClauseOf<'travelers'>['status'];

export const travelerStatusWords: Record<TravelerStatus, string> = {
  going: 'going',
  maybe: 'maybe',
  not_going: 'not going'
};

export const peopleKinds: ClauseKindDefinitions<'packing_items' | 'packing_packed' | 'travelers'> =
  {
    packing_items: {
      category: 'people',
      check: (clause, { packing }) => counted(clause, packing.length),
      create: () => ({ comparator: 'at_least', count: 10, kind: 'packing_items' }),
      description: 'How long the packing list is.',
      label: (clause) => `The packing list has ${quantity(clause, 'item')}`,
      needs: ['packing'],
      normalize: (clause) => normalizeCount(clause, 'Item count'),
      title: 'Packing list'
    },
    packing_packed: {
      category: 'people',
      check: (_clause, { packing }) =>
        everyHas(packing, ({ packed }) => packed, {
          missing: 'still to pack',
          none: 'No packing list yet'
        }),
      create: () => ({ kind: 'packing_packed' }),
      description: 'Every item on the packing list is ticked.',
      label: () => 'Everything on the packing list is packed',
      needs: ['packing'],
      normalize: () => ({ kind: 'packing_packed' }),
      title: 'All packed'
    },
    travelers: {
      category: 'people',
      check: (clause, { travelers }) =>
        counted(clause, travelers.filter(({ status }) => status === clause.status).length),
      create: () => ({ comparator: 'at_least', count: 2, kind: 'travelers', status: 'going' }),
      description: 'How many people said going, maybe, or not going.',
      label: (clause) =>
        `${capitalize(quantity(clause, 'traveler'))} ${clause.count === 1 ? 'says' : 'say'} ${travelerStatusWords[clause.status]}`,
      needs: ['travelers'],
      normalize: (clause) => normalizeCount(clause, 'Traveler count'),
      title: 'RSVPs'
    }
  };

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
