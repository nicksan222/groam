import { useCallback, useEffect, useState } from 'react';
import type { TripLocation } from '@/features/trips/trip-location';
import { searchLocations } from '@/features/trips/trip-location-search';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

export function useTripDestinationSearch(alwaysActive = false) {
  const { closePanel, open, openPanel, setOpen } = useOpenState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TripLocation[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalized = query.trim();
    if ((!open && !alwaysActive) || normalized.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setResults([]);
    setError(null);
    const timeout = window.setTimeout(() => {
      void searchLocations(normalized, controller.signal)
        .then((locations) => {
          if (!controller.signal.aborted) setResults(locations);
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted) return;
          setError(caught instanceof Error ? caught.message : 'Location search is unavailable');
          setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [alwaysActive, open, query]);

  const closeAndClear = useCallback(() => {
    closePanel();
    setQuery('');
  }, [closePanel]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) setQuery('');
    },
    [setOpen]
  );

  return {
    closeAndClear,
    error,
    isLoading,
    isOpen: open,
    onOpenChange,
    open: openPanel,
    query,
    results,
    setQuery
  };
}
