import type { Id } from '@groam/backend/data-model';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { TripPageHero } from '@/features/trips/trip-detail/trip-page-hero';
import { testIds } from '@/lib/test-ids';
import type { IdeaPrimaryAction, IdeaStatus } from '@/types/ideas';
import { IdeaCloneHeaderActions } from './idea-clone-header-actions';
import type { IdeaCloneView } from './idea-sections';
import { IdeaWorkspaceHeading } from './idea-workspace-heading';

export function IdeaCloneHero({
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
  showLoading,
  sourceTripName,
  status,
  trip,
  tripId,
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
  showLoading: boolean;
  sourceTripName?: string;
  status?: IdeaStatus;
  trip?: TripDetail;
  tripId: Id<'trips'>;
  tripState: TripState;
  view: IdeaCloneView;
}) {
  if (showLoading || !trip || !status) return <TripPageHero isLoading />;
  return (
    <IdeaWorkspaceHeading
      status={status}
      reviewing={view === 'compare'}
      actions={
        <div
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
      sourceTripName={sourceTripName}
      trip={trip}
      tripId={tripId}
    />
  );
}
