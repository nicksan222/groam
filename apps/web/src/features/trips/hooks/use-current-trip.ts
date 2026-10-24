import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useQuery } from 'convex/react';
import { useContext, useEffect, useSyncExternalStore } from 'react';
import {
  currentTripPreference,
  subscribeCurrentTripPreference
} from '@/features/trips/current-trip-preference';
import { useCurrentTripPreferenceKey } from '@/features/trips/hooks/use-remember-trip';
import { useTripRecord } from '@/features/trips/hooks/use-trip-record';
import {
  ReferenceStatusContext,
  useResolvedParams
} from '@/features/workspace/hooks/reference-context';
import { useParams } from '@/lib/navigation/router';

/** The trip the URL names, once its reference has resolved. */
function useRouteTrip() {
  const params = useParams<{ tripId: string }>();
  const reference = params.tripId ?? null;
  const resolved = useResolvedParams(params).tripId ?? null;
  const { loading, missing } = useContext(ReferenceStatusContext);
  // An unresolved reference stays as written; only a resolved one is a trip id.
  const unresolved = loading || (missing && resolved === reference);
  return {
    pending: reference !== null && loading,
    reference,
    tripId: reference !== null && !unresolved ? (resolved as Id<'trips'>) : null
  };
}

/** The short id remembered for this group, resolved to a trip id; stale ones are forgotten. */
function useRememberedTrip(enabled: boolean) {
  const key = useCurrentTripPreferenceKey();
  const preference = currentTripPreference(key);
  // Subscribed, so a page that remembers its trip (an issue's own page) updates the sidebar at once.
  const stored = useSyncExternalStore(
    subscribeCurrentTripPreference,
    () => preference.read(),
    () => null
  );
  const remembered = enabled ? stored : null;
  const resolved = useQuery(
    api.routes.references.resolve.run,
    remembered ? { reference: remembered, table: 'trips' } : 'skip'
  );
  useEffect(() => {
    if (remembered && resolved === null) preference.clear();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- `preference` is rebuilt every render
  }, [key, remembered, resolved]);
  return {
    pending: remembered !== null && resolved === undefined,
    tripId: (resolved?.id as Id<'trips'> | undefined) ?? null
  };
}

/**
 * The trip the sidebar is about: the route's trip, else the last shared trip opened in this group
 * on this device (remembered by short id). A working copy stands for the shared trip it edits.
 * Reads the lightweight `find` record, so it never triggers cover work.
 */
export function useCurrentTrip() {
  const route = useRouteTrip();
  const remembered = useRememberedTrip(route.reference === null);
  const candidateId = route.tripId ?? remembered.tripId;
  const record = useTripRecord(candidateId ?? undefined);
  const shared = useTripRecord(record?.proposal?.sourceTripId);
  const viaWorkingCopy = Boolean(record?.proposal);
  const trip = (viaWorkingCopy ? shared : record) ?? null;

  const waitingOnRecord = candidateId !== null && record === undefined;
  const waitingOnSource = viaWorkingCopy && shared === undefined;
  return {
    isLoading: route.pending || remembered.pending || waitingOnRecord || waitingOnSource,
    onTripRoute: route.reference !== null,
    /** How links write the trip: the URL's own reference on its page, else its short id. */
    reference: (viaWorkingCopy ? null : route.reference) ?? trip?.shortId ?? null,
    trip
  };
}
