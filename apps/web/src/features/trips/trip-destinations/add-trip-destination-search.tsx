import { SearchInput } from '@groam/ui/components/search-input';
import { useTripDestinationSearch } from '@/features/trips/hooks/use-trip-destination-search';
import type { TripLocation } from '@/features/trips/trip-location';
import { testIds } from '@/lib/test-ids';
import { SelectedTripDestination } from './selected-trip-destination';
import { TripDestinationSearchResults } from './trip-destination-search-results';

export function AddTripDestinationSearch({
  disabled,
  id,
  onSelect,
  selected
}: {
  disabled: boolean;
  id?: string;
  onSelect: (location: TripLocation | null) => void;
  selected: TripLocation | null;
}) {
  const { error, isLoading, query, results, setQuery } = useTripDestinationSearch(true);
  const waitingForQuery = query.trim().length < 2;
  const hintId = id ? `${id}-hint` : undefined;

  return (
    <div className="space-y-3">
      <SearchInput
        aria-describedby={hintId}
        aria-label="Search destinations"
        autoFocus
        autoComplete="off"
        data-testid={testIds.destinationSearchInput}
        disabled={disabled}
        id={id}
        inputClassName="h-11 text-base"
        maxLength={120}
        onChange={(event) => {
          onSelect(null);
          setQuery(event.target.value);
        }}
        placeholder="City or place, e.g. Lisbon"
        value={query}
      />
      <p className="text-xs text-muted-foreground" id={hintId}>
        {selected
          ? 'Destination selected. Search again to choose a different place.'
          : 'Search for a city, region, or landmark, then select a result.'}
      </p>
      {selected ? (
        <SelectedTripDestination location={selected} />
      ) : !waitingForQuery ? (
        <section
          aria-busy={isLoading}
          aria-label="Destination results"
          className="max-h-64 overflow-y-auto"
        >
          <TripDestinationSearchResults
            disabled={disabled}
            error={error}
            isLoading={isLoading}
            onSelect={onSelect}
            results={results}
          />
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Place data from OpenStreetMap contributors
          </p>
        </section>
      ) : null}
    </div>
  );
}
