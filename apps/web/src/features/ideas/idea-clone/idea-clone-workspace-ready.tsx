import type { Id } from '@groam/backend/data-model';
import { needsSharedTripUpdate } from '@/features/ideas/hooks/idea-needs-update';
import { useIdeaCloneWorkspace } from '@/features/ideas/hooks/use-idea-clone-workspace';
import { TripDetailsEditor } from '@/features/trips/trip-detail/trip-details-editor';
import { TripNotFound } from '@/features/trips/trip-detail/trip-not-found';
import { TripPageShell } from '@/features/trips/trip-detail/trip-page-shell';
import { TripToolbarSkeleton } from '@/features/trips/trip-detail/trip-toolbar-skeleton';
import { TripIdeaNotice } from '@/features/trips/trip-ideas/trip-idea-notice';
import { IdeaCloneBody } from './idea-clone-body';
import { IdeaCloneHeader } from './idea-clone-header';
import { IdeaCloneLifecycleDialogs } from './idea-clone-lifecycle-dialogs';
import { IdeaCloneNav } from './idea-clone-nav';
import { IdeaCloneUpdateBanner } from './idea-clone-update-banner';
import type { IdeaCloneView as CloneView } from './idea-sections';

// oxlint-disable-next-line groam/no-local-type-definitions -- local composition shape
type IdeaClonePage = ReturnType<typeof useIdeaCloneWorkspace>;

function IdeaClonePageHero({
  page,
  proposalId,
  sharedTripId,
  updatePrompted,
  view
}: {
  page: IdeaClonePage;
  proposalId: Id<'tripProposals'>;
  sharedTripId: Id<'trips'>;
  updatePrompted: boolean;
  view: CloneView;
}) {
  const { proposal, showLoading, trip, version, workingState } = page;
  if (showLoading || !trip || !proposal?.status) return <TripToolbarSkeleton />;
  return (
    <IdeaCloneHeader
      ideaName={proposal?.ideaName}
      onCloseIdea={version.proposal?.canClose ? page.closingIdea.openPanel : undefined}
      onEdit={page.editDetails}
      onOpenShared={page.openShared}
      onPrimary={page.runPrimary}
      onResolve={
        proposal?.canResolve ? () => void page.run('resolve', () => version.resolve([])) : undefined
      }
      pending={page.pendingAction !== null}
      primary={updatePrompted && page.primary?.intent === 'rebase' ? null : page.primary}
      proposalId={proposalId}
      sharedTripId={sharedTripId}
      sourceTripName={page.idea.sharedTrip?.name}
      status={proposal?.status}
      trip={trip}
      tripState={workingState}
      view={view}
    />
  );
}

export function IdeaCloneWorkspaceReady({
  addDestinationOpen,
  changeCount,
  proposalId,
  sharedTripId,
  view,
  workingTripId
}: {
  addDestinationOpen: boolean;
  changeCount: number;
  proposalId: Id<'tripProposals'>;
  sharedTripId: Id<'trips'>;
  view: CloneView;
  workingTripId: Id<'trips'>;
}) {
  const page = useIdeaCloneWorkspace({ proposalId, sharedTripId, view, workingTripId });
  if (page.missing) return <TripNotFound />;
  const { proposal, showLoading, trip, version, workingState } = page;
  const updatePrompted = Boolean(proposal && needsSharedTripUpdate(proposal));

  return (
    <TripPageShell
      banner={
        showLoading || !proposal ? undefined : (
          <IdeaCloneUpdateBanner
            onReviewConflicts={view === 'compare' ? undefined : () => page.openView('compare')}
            onRebase={version.rebase}
            pendingAction={page.pendingAction}
            proposal={proposal}
          />
        )
      }
      body={
        <IdeaCloneBody
          addDestinationOpen={addDestinationOpen}
          navigation={page.navigation}
          onEdit={page.editDetails}
          planningSection={page.planningSection}
          proposalId={proposalId}
          showLoading={showLoading}
          trip={trip}
          tripState={workingState}
          view={view}
        />
      }
      hero={
        <IdeaClonePageHero
          page={page}
          proposalId={proposalId}
          sharedTripId={sharedTripId}
          updatePrompted={updatePrompted}
          view={view}
        />
      }
      isLoading={showLoading}
      notice={<TripIdeaNotice />}
      nav={
        showLoading || !trip ? (
          <IdeaCloneNav isLoading view={view} />
        ) : (
          <IdeaCloneNav
            viewOnly={!trip.permissions.canEdit}
            changeCount={changeCount}
            onOpen={page.openView}
            stopCount={trip.destinations.length}
            view={view}
          />
        )
      }
    >
      {!showLoading && trip && page.editing.open ? (
        <TripDetailsEditor
          onClose={page.editing.closePanel}
          trip={trip}
          update={workingState.update}
        />
      ) : null}
      <IdeaCloneLifecycleDialogs
        closingOpen={page.closingIdea.open}
        confirmingApply={page.confirmingApply}
        pendingAction={page.pendingAction}
        proposal={proposal}
        run={page.run}
        setClosingOpen={page.closingIdea.setOpen}
        setConfirmingApply={page.setConfirmingApply}
        sharedTripId={sharedTripId}
        version={version}
      />
    </TripPageShell>
  );
}
