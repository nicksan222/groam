import type { Id } from '@groam/backend/data-model';
import { needsSharedTripUpdate } from '@/features/ideas/hooks/idea-needs-update';
import { useIdeaCloneWorkspace } from '@/features/ideas/hooks/use-idea-clone-workspace';
import { TripDetailsEditor } from '@/features/trips/trip-detail/trip-details-editor';
import { TripNotFound } from '@/features/trips/trip-detail/trip-not-found';
import { TripPageShell } from '@/features/trips/trip-detail/trip-page-shell';
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
  changeCount,
  page,
  proposalId,
  sharedTripId,
  updatePrompted,
  view
}: {
  changeCount: number;
  page: IdeaClonePage;
  proposalId: Id<'tripProposals'>;
  sharedTripId: Id<'trips'>;
  updatePrompted: boolean;
  view: CloneView;
}) {
  const { proposal, showLoading, trip, version } = page;
  if (showLoading || !trip || !proposal?.status) return null;
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
      status={proposal?.status}
      tabs={
        <IdeaCloneNav
          changeCount={changeCount}
          onOpen={page.openView}
          stopCount={trip.destinations.length}
          view={view}
          viewOnly={!trip.permissions.canEdit}
        />
      }
      trip={trip}
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
          planningSection={page.planningSection}
          proposalId={proposalId}
          showLoading={showLoading}
          trip={trip}
          tripState={workingState}
          view={view}
        />
      }
      header={
        <IdeaClonePageHero
          changeCount={changeCount}
          page={page}
          proposalId={proposalId}
          sharedTripId={sharedTripId}
          updatePrompted={updatePrompted}
          view={view}
        />
      }
      // The calendar scrolls inside itself, as on the shared trip, rather than inside the page.
      clearNav={view === 'compare'}
      fullBleed={view === 'calendar'}
      isLoading={showLoading}
      notice={<TripIdeaNotice />}
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
