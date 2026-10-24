import { isVisibleIdea } from '@groam/backend/convex/modules/travel/turn';
import { type KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useDiscussions } from '@/features/discussions/hooks/use-discussions';
import { ideaOpenHref } from '@/features/ideas/idea-href';
import { isRememberableTrip } from '@/features/trips/current-trip-preference';
import { useCurrentTrip } from '@/features/trips/hooks/use-current-trip';
import { useTripIssues } from '@/features/trips/hooks/use-trip-issues';
import { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import { useTrips } from '@/features/trips/hooks/use-trips';
import { currentTripSection } from '@/features/trips/trip-switcher/current-trip-section';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { useNavigate, useParams } from '@/lib/navigation/router';
import { useCommandPaletteChrome } from './command-palette-chrome';
import { buildCommandPaletteMatches, type CommandPaletteMatch } from './command-palette-results';

const PAGE_SIZE = 25;

export function useCommandPalette() {
  const { closeAndClear, onOpenChange, open, query, setQuery, toggle } = useCommandPaletteChrome();
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const { onTripRoute, reference, trip } = useCurrentTrip();
  const params = useParams<{
    discussionId: string;
    issueId: string;
    proposalId: string;
    researchId: string;
    section: string;
  }>();
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const sharedId = isRememberableTrip(trip) ? trip.id : undefined;
  const current = useMemo(
    () => (sharedId && reference ? { id: sharedId, reference } : null),
    [reference, sharedId]
  );
  // The sidebar's own subscriptions, so Convex serves them once; skipped while the palette is closed.
  const tripId = open ? current?.id : undefined;
  const trips = useTrips(open ? { includeArchived: false, initialNumItems: PAGE_SIZE } : 'skip');
  const { proposals } = useTripVersions(tripId, open);
  const { issues } = useTripIssues(tripId, open);
  const isLoadingMore = trips.status === 'LoadingMore';
  const { discussions } = useDiscussions(open ? undefined : 'skip');
  const section = onTripRoute || params.issueId ? currentTripSection(params) : null;

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setActiveIndex(0);
        toggle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  const results = useMemo(
    () =>
      buildCommandPaletteMatches(
        query,
        {
          current,
          discussions,
          ideas: (proposals ?? []).filter((idea) => isVisibleIdea(idea, viewerUserId)),
          issues: issues ?? [],
          section,
          trips: trips.trips
        },
        {
          ideaHref: (idea) =>
            ideaOpenHref(
              {
                author: idea.author,
                id: idea.id,
                sourceTripId: current?.id,
                status: idea.status,
                workingTripId: idea.workingTripId
              },
              viewerUserId
            )
        }
      ),
    [current, discussions, issues, proposals, query, section, trips.trips, viewerUserId]
  );

  const go = useCallback(
    (result: CommandPaletteMatch) => {
      closeAndClear();
      void navigate(result.href as never);
    },
    [closeAndClear, navigate]
  );

  const active = Math.min(activeIndex, Math.max(results.length - 1, 0));

  const search = useCallback(
    (next: string) => {
      setActiveIndex(0);
      setQuery(next);
    },
    [setQuery]
  );

  const onInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const next = nextActiveIndex(event, active, results.length);
      if (next !== null) {
        event.preventDefault();
        setActiveIndex(next);
      } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
        event.preventDefault();
        const result = results[active];
        if (result) go(result);
      }
    },
    [active, go, results]
  );

  return {
    activeIndex: active,
    canLoadMore: isLoadingMore || trips.status === 'CanLoadMore',
    go,
    isLoadingMore,
    loadMore: () => {
      if (isLoadingMore) return;
      if (trips.status === 'CanLoadMore') trips.loadMore(PAGE_SIZE);
    },
    onInputKeyDown,
    onOpenChange: (next: boolean) => {
      setActiveIndex(0);
      onOpenChange(next);
    },
    open,
    query,
    results,
    setActiveIndex,
    setQuery: search
  };
}

/** Arrow keys wrap; Ctrl/⌘ + Home/End jump, leaving plain Home/End to the caret. */
function nextActiveIndex(
  event: Pick<KeyboardEvent, 'ctrlKey' | 'key' | 'metaKey'>,
  active: number,
  count: number
) {
  const last = count - 1;
  if (last < 0) return null;
  if (event.key === 'ArrowDown') return active === last ? 0 : active + 1;
  if (event.key === 'ArrowUp') return active === 0 ? last : active - 1;
  if (!event.ctrlKey && !event.metaKey) return null;
  if (event.key === 'Home') return 0;
  return event.key === 'End' ? last : null;
}
