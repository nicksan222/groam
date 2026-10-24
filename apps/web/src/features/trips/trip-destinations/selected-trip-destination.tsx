import { Check } from '@groam/icons';
import { IconTile } from '@groam/ui/components/icon-tile';
import type { TripLocation } from '@/features/trips/trip-location';

export function SelectedTripDestination({ location }: { location: TripLocation }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 p-4" role="status">
      <IconTile radius="full" size="lg" variant="outline-primary">
        <Check aria-hidden className="size-5" />
      </IconTile>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{location.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {[location.type, location.context].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  );
}
