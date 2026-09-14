import { ErrorWell } from '@groam/ui/components/error-well';
import { LoadingPlaceholder } from '@groam/ui/components/loading-placeholder';
import { SelectRow } from '@groam/ui/components/select-row';
import { MapPin } from 'lucide-react';
import type { TripLocation } from '@/features/trips/trip-location';
import { testIds } from '@/lib/test-ids';

export function TripDestinationSearchResults({
  disabled,
  error,
  isLoading,
  onSelect,
  results
}: {
  disabled: boolean;
  error: string | null;
  isLoading: boolean;
  onSelect: (location: TripLocation) => void;
  results: readonly TripLocation[];
}) {
  if (isLoading) {
    return (
      <LoadingPlaceholder
        className="min-h-28 rounded-xl border border-border"
        label="Searching places…"
      />
    );
  }
  if (error) return <ErrorWell>{error}</ErrorWell>;
  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-border p-5 text-center" role="status">
        <p className="text-sm font-medium">No matching places found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try a nearby city, region, or landmark.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((location) => (
        <SelectRow
          data-place-name={location.name}
          data-testid={testIds.destinationSearchResult}
          disabled={disabled}
          icon={
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border">
              <MapPin aria-hidden className="size-5 text-primary" />
            </span>
          }
          key={location.placeId}
          onSelect={() => onSelect(location)}
          subtitle={[location.type, location.context].filter(Boolean).join(' · ')}
          title={location.name}
        />
      ))}
    </div>
  );
}
