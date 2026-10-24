import { Link2, Star } from '@groam/icons';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@groam/ui/components/dropdown-menu';
import { toast } from '@groam/ui/components/toast';
import { useTripSidebarActions } from '@/features/trips/hooks/use-trip-sidebar-actions';
import { defaultTripSection } from '@/features/trips/trip-sections';
import { absoluteHref } from '@/lib/navigation/base-path';
import type { CurrentTrip } from '@/types/trips';

async function copyTripLink(reference: string) {
  const url = absoluteHref(`/trips/${reference}/${defaultTripSection}`);
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Trip link copied');
  } catch {
    toast.error('Unable to copy trip link');
  }
}

/** Favourite and copy link for the current trip. Favourite needs the trip's place in the list. */
export function TripSwitcherActions({
  favorite,
  reference,
  trip
}: {
  /** Whether the viewer favourited the trip, when the trip is in the workspace list; else unknown. */
  favorite: boolean | undefined;
  reference: string;
  trip: NonNullable<CurrentTrip>;
}) {
  const { pendingTripId, toggleFavorite } = useTripSidebarActions();
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
        This trip
      </DropdownMenuLabel>
      {favorite === undefined ? null : (
        <DropdownMenuItem
          disabled={pendingTripId === trip.id}
          onSelect={() => void toggleFavorite(trip.id, favorite)}
        >
          <Star className={favorite ? 'fill-current' : undefined} />
          {favorite ? 'Unfavourite' : 'Favourite'}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onSelect={() => void copyTripLink(reference)}>
        <Link2 /> Copy link
      </DropdownMenuItem>
    </>
  );
}
