import { everyHas } from '#convex/modules/travel/issues/rules/helpers';
import type { ClauseKindDefinitions, ClauseOf } from '#convex/modules/travel/issues/rules/types';

export type TransferMode = NonNullable<ClauseOf<'boundary_transfer'>['mode']>;
export type Boundary = ClauseOf<'boundary_transfer'>['boundary'];
export type DetailField = ClauseOf<'transfers_detailed'>['field'];

export const transferModeWords: Record<TransferMode, string> = {
  bicycle: 'bicycle',
  bus: 'bus',
  car: 'car',
  ferry: 'ferry',
  flight: 'flight',
  other: 'other',
  public_transit: 'public transit',
  rideshare: 'rideshare',
  shuttle: 'shuttle',
  taxi: 'taxi',
  train: 'train',
  walk: 'walk'
};

export const boundaryWords: Record<Boundary, string> = {
  arrival: 'Getting there',
  both: 'Getting there and back',
  departure: 'Getting back'
};

export const transferFieldWords: Record<DetailField, string> = {
  cost: 'a cost',
  timing: 'a time'
};

export const transferKinds: ClauseKindDefinitions<
  'boundary_transfer' | 'legs_covered' | 'transfers_detailed'
> = {
  boundary_transfer: {
    category: 'transfers',
    check: ({ boundary, mode }, { transfers }) => {
      const planned = (side: 'arrival' | 'departure') =>
        transfers.boundary.some(
          (transfer) => transfer.boundary === side && (mode === undefined || transfer.mode === mode)
        );
      const missing = (['arrival', 'departure'] as const).filter(
        (side) => (boundary === 'both' || boundary === side) && !planned(side)
      );
      if (missing.length === 0) return { detail: null, met: true };
      return {
        detail: missing.length === 2 ? 'Neither is planned' : `No ${missing[0]} yet`,
        met: false
      };
    },
    create: () => ({ boundary: 'both', kind: 'boundary_transfer' }),
    description: 'How the group gets there and back is planned.',
    label: ({ boundary, mode }) =>
      `${boundaryWords[boundary]} ${boundary === 'both' ? 'are' : 'is'} planned${mode ? ` by ${transferModeWords[mode]}` : ''}`,
    needs: ['transfers'],
    normalize: ({ boundary, mode }) => ({
      boundary,
      kind: 'boundary_transfer',
      ...(mode ? { mode } : {})
    }),
    title: 'Getting there and back'
  },
  legs_covered: {
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
    create: () => ({ kind: 'legs_covered' }),
    description: 'Every move between destinations has a transfer.',
    label: () => 'Every leg between destinations has a transfer',
    needs: ['destinations', 'transfers'],
    normalize: () => ({ kind: 'legs_covered' }),
    title: 'Every leg covered'
  },
  transfers_detailed: {
    category: 'transfers',
    check: ({ field }, { transfers }) =>
      everyHas(
        [...transfers.boundary, ...transfers.destination, ...transfers.activity],
        (transfer) => transfer[field] !== undefined,
        { missing: `without ${transferFieldWords[field]}`, none: 'No transfers yet' }
      ),
    create: () => ({ field: 'timing', kind: 'transfers_detailed' }),
    description: 'Every transfer has a cost or a time.',
    label: ({ field }) => `Every transfer has ${transferFieldWords[field]}`,
    needs: ['transfers'],
    normalize: ({ field }) => ({ field, kind: 'transfers_detailed' }),
    title: 'Transfers filled in'
  }
};
