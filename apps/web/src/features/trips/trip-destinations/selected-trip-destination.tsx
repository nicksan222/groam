import { Check } from 'lucide-react';
import type { TripLocation } from '@/features/trips/trip-location';

export function SelectedTripDestination({ location }: { location: TripLocation }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 p-4" role="status">
      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/25 text-primary">
        <Check aria-hidden className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{location.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {[location.type, location.context].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  );
}
