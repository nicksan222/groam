import { Button } from '@groam/ui/components/button';
import { IconTile } from '@groam/ui/components/icon-tile';
import Shell from '@groam/ui/components/shell/client';
import { Skeleton } from '@groam/ui/components/skeleton';
import { MapPinned, Plus, Route } from 'lucide-react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import { RouteStopCard } from './route-stop-card';

const routeLoadingDescription = 'Stops and activities appear here once the route loads.';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type RouteBoardLoadedProps = {
  isLoading?: false;
  onAddDestination: () => void;
  onOpenItinerary: () => void;
  trip: TripDetail;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type RouteBoardLoadingProps = {
  isLoading: true;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type RouteBoardProps = RouteBoardLoadedProps | RouteBoardLoadingProps;

export function RouteBoard(props: RouteBoardProps) {
  if (props.isLoading) {
    return (
      <Shell.Section aria-busy="true">
        <Shell.SectionHeader
          density="compact"
          description={routeLoadingDescription}
          icon={Route}
          title="Route"
        />
        <ul aria-hidden className="space-y-3">
          {[0, 1, 2].map((stop) => (
            <li className="flex items-center gap-4" key={stop}>
              <Skeleton className="size-16 shrink-0 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      </Shell.Section>
    );
  }

  const { onAddDestination, onOpenItinerary, trip } = props;
  const activityCount = trip.destinations.reduce(
    (count, destination) => count + destination.activities.length,
    0
  );
  const stopCount = trip.destinations.length;
  const canChangePlan = trip.permissions.canEdit || trip.permissions.canPropose;

  return (
    <Shell.Section>
      <Shell.SectionHeader
        density="compact"
        description={`${activityCount} activit${activityCount === 1 ? 'y' : 'ies'} currently planned across the route.`}
        icon={Route}
        title="Route"
        trailing={
          canChangePlan ? (
            <Button
              data-testid={testIds.tripActionAddStop}
              onClick={onAddDestination}
              size="sm"
              variant="outline"
            >
              <Plus />
              <span className="max-sm:sr-only">Add stop</span>
            </Button>
          ) : undefined
        }
      />

      {stopCount === 0 ? (
        <Shell.Card asChild className="grid w-full place-items-center" variant="dashed">
          <button onClick={onAddDestination} type="button">
            <span>
              <IconTile className="mx-auto" radius="xl" size="lg" variant="outline-muted">
                <MapPinned className="size-4" />
              </IconTile>
              <span className="mt-3 block text-sm font-medium text-foreground">No route yet</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Add the first destination to start planning.
              </span>
            </span>
          </button>
        </Shell.Card>
      ) : (
        <ul aria-label="Route stops" className="space-y-2">
          {trip.destinations.map((destination, index) => (
            <RouteStopCard
              destination={destination}
              key={destination.id}
              onOpenItinerary={onOpenItinerary}
              stop={index + 1}
            />
          ))}
        </ul>
      )}
    </Shell.Section>
  );
}
