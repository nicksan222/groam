import { Button } from '@groam/ui/components/button';
import { ArrowRight } from 'lucide-react';
import { ideaCreateCta } from '@/features/ideas/idea-glossary';
import { useTripTravelers } from '@/features/trips/hooks/use-trip-travelers';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripBoardFullscreenToggle } from '@/features/trips/trip-board/trip-board-fullscreen-toggle';
import type { TripSection } from '@/features/trips/trip-sections';
import { TripTravelersSheet } from '@/features/trips/trip-travelers/trip-travelers-sheet';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { testIds } from '@/lib/test-ids';
import type { TripState } from './trip-detail-types';
import { TripHeader } from './trip-header';
import { TripNavigationActions } from './trip-navigation-actions';
import { TripToolbarChips } from './trip-toolbar-chips';
import { tripToolbarFacts } from './trip-toolbar-facts';
import { useTripCover } from './use-trip-cover';

export function TripToolbar({
  onEdit,
  onStartIdea,
  section = 'board',
  startingIdea = false,
  trip,
  tripState
}: {
  onEdit: () => void;
  onStartIdea?: () => void;
  section?: TripSection;
  startingIdea?: boolean;
  trip: TripDetail;
  tripState: TripState;
}) {
  const roster = useOpenState(false);
  const { goingCount } = useTripTravelers(trip.id);
  const cover = useTripCover(trip, tripState.retryCover);
  const facts = tripToolbarFacts(trip);
  const archived = trip.archivedAt !== null;
  const travelerCount = goingCount > 0 ? goingCount : trip.groupMemberCount;
  const showsBoard = !trip.proposal && section === 'board';
  const canStartIdea = Boolean(onStartIdea && trip.permissions.canPropose && !archived);

  return (
    <>
      <TripHeader
        actions={
          <>
            <span
              className="hidden h-6 items-center rounded-full sm:inline-flex bg-background/80 px-2.5 text-xs text-muted-foreground backdrop-blur-sm"
              data-testid={testIds.sharedTripBanner}
            >
              {archived ? 'Archived · read-only' : 'Shared plan · read-only'}
            </span>
            {canStartIdea ? (
              <Button
                data-testid={testIds.sharedTripNewIdea}
                disabled={startingIdea}
                onClick={onStartIdea}
                size="sm"
              >
                {ideaCreateCta} <ArrowRight />
              </Button>
            ) : null}
            <div className="rounded-lg bg-background/80 text-foreground backdrop-blur-sm">
              <TripNavigationActions
                leading={showsBoard ? <TripBoardFullscreenToggle /> : null}
                onEdit={onEdit}
                section={section}
                trip={trip}
                tripState={tripState}
              />
            </div>
          </>
        }
        chips={
          <TripToolbarChips
            destinationStatus={trip.destination.status}
            facts={facts}
            onOpenRoster={roster.openPanel}
            travelerCount={travelerCount}
          />
        }
        cover={cover}
        dataTripId={trip.id}
        dataTripName={trip.name}
        testId={testIds.tripHeading}
        title={trip.name}
      />
      <TripTravelersSheet
        onOpenChange={roster.setOpen}
        open={roster.open}
        tripId={trip.id}
        tripName={trip.name}
      />
    </>
  );
}
