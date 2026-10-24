import { api } from '@groam/backend/api';
import { type RequestForQueries, useQueries } from 'convex/react';
import { useMemo } from 'react';
import type { TripsTurn } from '@/types/dashboard';

const noQueries: RequestForQueries = {};

/**
 * What waits on the viewer in each of their trips: `undefined` while it loads or when `enabled` is
 * false, and `null` when it could not be read, so callers keep their trips without counts instead
 * of failing the page.
 */
export function useTripsTurn(enabled = true): TripsTurn | null | undefined {
  // useQueries needs a stable request object.
  const queries = useMemo<RequestForQueries>(
    () => (enabled ? { turn: { args: {}, query: api.routes.trips.turn.run } } : noQueries),
    [enabled]
  );
  const turn = useQueries(queries)['turn'] as TripsTurn | Error | undefined;
  return turn instanceof Error ? null : turn;
}
