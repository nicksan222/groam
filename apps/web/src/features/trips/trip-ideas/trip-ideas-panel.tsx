import { Button } from '@groam/ui/components/button';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripVersionsPanel } from '@/features/trips/trip-versions/trip-versions-panel';
import { Link } from '@/features/workspace/navigation/router';

export function TripIdeasPanel({
  onStartIdea,
  startingIdea,
  trip
}: {
  onStartIdea?: () => void;
  startingIdea?: boolean;
  trip: TripDetail;
}) {
  return (
    <TripVersionsPanel
      onStartIdea={onStartIdea}
      startingIdea={startingIdea}
      trailing={
        <Button asChild size="sm" variant="outline">
          <Link to="/ideas">All ideas</Link>
        </Button>
      }
      trip={trip}
    />
  );
}
