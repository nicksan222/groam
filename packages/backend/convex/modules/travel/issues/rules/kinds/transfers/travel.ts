import { v } from 'convex/values';
import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { met, unmet } from '#convex/modules/travel/issues/rules/helpers';
import { TripTransferValidators } from '#convex/modules/travel/transfers/schema';

const boundary = v.union(v.literal('arrival'), v.literal('departure'), v.literal('both'));
type Boundary = typeof boundary.type;
type Mode = typeof TripTransferValidators.mode.type;

const modeWords: Record<Mode, string> = {
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

/** How the sentence names each leg, and how the picker does, since the title says "Travel". */
const boundaryWords: Record<Boundary, { choice: string; label: string }> = {
  arrival: { choice: 'there', label: 'Getting there' },
  both: { choice: 'there and back', label: 'Getting there and back' },
  departure: { choice: 'back', label: 'Getting back' }
};

export const boundaryTransfer = defineClauseKind({
  args: { boundary, mode: v.optional(TripTransferValidators.mode) },
  category: 'transfers',
  check: ({ boundary: wanted, mode }, { transfers }) => {
    const planned = (side: 'arrival' | 'departure') =>
      transfers.boundary.some(
        (transfer) => transfer.boundary === side && (mode === undefined || transfer.mode === mode)
      );
    const missing = (['arrival', 'departure'] as const).filter(
      (side) => (wanted === 'both' || wanted === side) && !planned(side)
    );
    if (missing.length === 0) return met;
    return unmet(missing.length === 2 ? 'Neither is planned' : `No ${missing[0]} yet`);
  },
  create: () => ({ boundary: 'both' as const }),
  description: 'The trip to the first stop and home from the last have transfers.',
  fields: [
    {
      key: 'boundary',
      label: 'Which way',
      options: Object.fromEntries(
        Object.entries(boundaryWords).map(([key, { choice }]) => [key, choice])
      ),
      type: 'choice'
    },
    {
      any: 'any way',
      key: 'mode',
      label: 'Travel mode',
      options: Object.fromEntries(
        Object.entries(modeWords).map(([key, words]) => [key, `by ${words}`])
      ),
      type: 'choice'
    }
  ],
  kind: 'boundary_transfer',
  label: ({ boundary: wanted, mode }) =>
    `${boundaryWords[wanted].label} ${wanted === 'both' ? 'are' : 'is'} planned${mode ? ` by ${modeWords[mode]}` : ''}`,
  needs: ['transfers'],
  normalize: ({ boundary: wanted, mode }) => ({ boundary: wanted, ...(mode ? { mode } : {}) }),
  title: 'Travel planned'
});
