import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { nextStepFor } from '@/features/trips/hooks/trip-overview-next-step';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { TripDurationPlanner } from '@/features/trips/trip-overview/trip-duration-planner';

import { OverviewProperties } from './overview-properties';
import { PlanningReadiness } from './planning-readiness';
import { RouteBoard } from './route-board';
import { TripCover } from './trip-cover';
import { TripPackingList } from './trip-packing-list';

function durationPlannerStartVersion({
  canEdit,
  canPropose,
  onEditDetails,
  onStartVersion
}: {
  canEdit: boolean;
  canPropose: boolean;
  onEditDetails: () => void;
  onStartVersion?: () => void;
}) {
  if (canEdit) return undefined;
  return onStartVersion ?? (canPropose ? onEditDetails : undefined);
}

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type TripOverviewLoadedProps = {
  hidePageCover?: boolean;
  isLoading?: false;
  onAddDestination: () => void;
  onEditDetails: () => void;
  onOpenItinerary: () => void;
  onStartVersion?: () => void;
  onUpdateDuration: (days: number, startDate: string | undefined) => Promise<boolean>;
  replaceCover: (cover: File) => Promise<boolean>;
  retryCover: () => Promise<boolean>;
  trip: TripDetail;
  tripState?: TripState;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type TripOverviewLoadingProps = {
  isLoading: true;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type TripOverviewProps = TripOverviewLoadedProps | TripOverviewLoadingProps;

export function TripOverview(props: TripOverviewProps) {
  if (props.isLoading) return <PageLoading label="Loading trip…" />;

  const {
    hidePageCover = false,
    onAddDestination,
    onEditDetails,
    onOpenItinerary,
    onStartVersion,
    onUpdateDuration,
    replaceCover,
    retryCover,
    trip,
    tripState
  } = props;

  const hasDestination = trip.destinations.length > 0;
  const hasTravelWindow = trip.dateNotes !== null || trip.startDate !== null;
  const hasDuration = trip.totalDurationDays !== null;
  const completedSteps = [hasDestination, hasTravelWindow, hasDuration].filter(Boolean).length;
  const minimumTimelineDays = Math.max(
    1,
    ...trip.destinations.flatMap((destination) => [
      destination.startDay ?? 0,
      destination.endDay ?? 0,
      ...destination.activities.map((activity) => activity.endDayNumber)
    ])
  );
  const nextStep = nextStepFor({
    hasDestination,
    hasDuration,
    hasTravelWindow,
    onAddDestination,
    onEditDetails,
    onOpenItinerary
  });

  return (
    <Shell.Stack stack="page">
      {hidePageCover ? null : (
        <TripCover
          onAddDestination={onAddDestination}
          replaceCover={replaceCover}
          retryCover={retryCover}
          trip={trip}
        />
      )}

      <Shell.TwoColumns>
        <Shell.LeftColumn>
          <Shell.Stack stack="sm">
            <RouteBoard
              onAddDestination={onAddDestination}
              onOpenItinerary={onOpenItinerary}
              trip={trip}
            />
            <OverviewProperties trip={trip} />
          </Shell.Stack>
          <div id="trip-length">
            <TripDurationPlanner
              canEdit={trip.permissions.canEdit}
              canPropose={trip.permissions.canPropose}
              key={`${trip.totalDurationDays ?? 'unset'}:${trip.startDate ?? ''}`}
              minimumDays={minimumTimelineDays}
              onSave={onUpdateDuration}
              onStartVersion={durationPlannerStartVersion({
                canEdit: trip.permissions.canEdit,
                canPropose: trip.permissions.canPropose,
                onEditDetails,
                onStartVersion
              })}
              startDate={trip.startDate}
              totalDays={trip.totalDurationDays}
            />
          </div>
        </Shell.LeftColumn>

        <Shell.RightColumn>
          <PlanningReadiness
            completedSteps={completedSteps}
            nextStep={nextStep}
            onEditDetails={onEditDetails}
            onOpenItinerary={hasDestination ? onOpenItinerary : onAddDestination}
            states={{ hasDestination, hasDuration, hasTravelWindow }}
            trip={trip}
            tripState={tripState}
          />
          {trip.archivedAt ? null : <TripPackingList trip={trip} />}
        </Shell.RightColumn>
      </Shell.TwoColumns>
    </Shell.Stack>
  );
}
