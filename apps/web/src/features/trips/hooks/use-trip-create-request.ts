import { useEffect, useRef } from 'react';
import { useTripCreateRequestStore } from '@/lib/stores/trip-create-request-store';
import type { TripSectionRequest } from '@/types/trips';

/** Runs `open` when the page header asks this section to start a `kind` of thing, or to filter/sort. */
export function useTripCreateRequest(kind: TripSectionRequest, open: () => void) {
  const requested = useTripCreateRequestStore((state) => state.requested);
  const clear = useTripCreateRequestStore((state) => state.clear);
  const latest = useRef(open);
  useEffect(() => {
    latest.current = open;
  });
  const nonce = requested?.kind === kind ? requested.nonce : 0;
  useEffect(() => {
    if (!nonce) return;
    latest.current();
    clear();
  }, [clear, nonce]);
}
