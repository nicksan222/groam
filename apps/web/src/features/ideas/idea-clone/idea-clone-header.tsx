import type { Id } from '@groam/backend/data-model';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { TripHeader } from '@/features/trips/trip-detail/trip-header';
import { TripToolbarChips } from '@/features/trips/trip-detail/trip-toolbar-chips';
import { tripToolbarFacts } from '@/features/trips/trip-detail/trip-toolbar-facts';
import { useTripCover } from '@/features/trips/trip-detail/use-trip-cover';
import { testIds } from '@/lib/test-ids';
import type { IdeaPrimaryAction, IdeaStatus } from '@/types/ideas';
import { IdeaCloneHeaderActions } from './idea-clone-header-actions';
import { IdeaHeaderStatus } from './idea-header-status';
import type { IdeaCloneView } from './idea-sections';

/** An idea's header: the shared trip header with the idea's title, state, and actions. */
export function IdeaCloneHeader({
  ideaName,
  onCloseIdea,
  onEdit,
  onOpenShared,
  onPrimary,
  onResolve,
  pending,
  primary,
  proposalId,
  sharedTripId,
  sourceTripName,
  status,
  trip,
  tripState,
  view
}: {
  ideaName?: string;
  onCloseIdea?: () => void;
  onEdit: () => void;
  onOpenShared: () => void;
  onPrimary: () => void;
  onResolve?: () => void;
  pending?: boolean;
  primary: IdeaPrimaryAction | null;
  proposalId: Id<'tripProposals'>;
  sharedTripId: Id<'trips'>;
  sourceTripName?: string;
  status: IdeaStatus;
  trip: TripDetail;
  tripState: TripState;
  view: IdeaCloneView;
}) {
  const idea = useOptionalIdeaContext();
  const cover = useTripCover(trip, tripState.retryCover);
  const facts = tripToolbarFacts(trip);
  return (
    <TripHeader
      actions={
        <div
          className="w-fit max-w-full rounded-lg bg-background/80 text-foreground backdrop-blur-sm"
          data-idea-id={proposalId}
          data-idea-name={ideaName}
          data-testid={testIds.ideaWorkspace}
        >
          <IdeaCloneHeaderActions
            canEdit={trip.permissions.canEdit}
            onCloseIdea={onCloseIdea}
            onEdit={onEdit}
            onOpenShared={onOpenShared}
            onPrimary={onPrimary}
            onResolve={onResolve}
            pending={pending}
            primary={primary}
            proposalId={proposalId}
            sharedTripId={sharedTripId}
            status={status}
            view={view}
          />
        </div>
      }
      chips={<TripToolbarChips destinationStatus={trip.destination.status} facts={facts} />}
      cover={cover}
      dataTripId={trip.id}
      dataTripName={trip.name}
      status={
        <IdeaHeaderStatus
          canEdit={trip.permissions.canEdit}
          reviewing={view === 'compare'}
          sharedTripName={sourceTripName ?? idea?.sharedTrip?.name ?? trip.name}
          status={status}
        />
      }
      testId={testIds.tripHeading}
      title={idea?.proposal?.title ?? trip.name}
    />
  );
}
