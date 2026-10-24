import { ArrowDownWideNarrow, ListFilter } from '@groam/icons';
import Shell from '@groam/ui/components/shell/client';
import type { TripTabSection } from '@/features/trips/trip-sections';
import { useTripCreateRequestStore } from '@/lib/stores/trip-create-request-store';

/** The shell owns the phone dock; desktop keeps these controls in the list footer. */
export function TripListActions({ section }: { section: TripTabSection }) {
  const request = useTripCreateRequestStore((state) => state.request);
  if (!['ideas', 'issues', 'polls', 'research', 'activity'].includes(section)) return null;
  return (
    <>
      <Shell.Action
        className="md:hidden"
        icon={ArrowDownWideNarrow}
        label="Sort"
        onClick={() => request('sort')}
        tone="secondary"
      />
      <Shell.Action
        className="md:hidden"
        icon={ListFilter}
        label="Filter"
        onClick={() => request('search')}
        tone="secondary"
      />
    </>
  );
}
