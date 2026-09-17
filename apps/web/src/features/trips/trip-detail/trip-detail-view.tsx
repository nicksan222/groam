import type { Id } from '@groam/backend/data-model';
import { PageCrumbNav } from '@groam/ui/components/page-crumb-nav';
import { useNavigate } from '@tanstack/react-router';
import { findViewerDrafts } from '@/features/ideas/hooks/viewer-pending-idea';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { useStartIdeaFlow } from '@/features/trips/hooks/use-start-idea-flow';
import { useTripAgentContext } from '@/features/trips/hooks/use-trip-agent-context';
import { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import { useTrip } from '@/features/trips/hooks/use-trips';
import { ActiveTripSection } from '@/features/trips/trip-detail/active-trip-section';
import { SharedTripBanner } from '@/features/trips/trip-detail/shared-trip-banner';
import { TripDetailsEditor } from '@/features/trips/trip-detail/trip-details-editor';
import { ContinueDraftDialog } from '@/features/trips/trip-ideas/continue-draft-dialog';
import { CreateTripIdeaDialog } from '@/features/trips/trip-ideas/create-trip-idea-dialog';
import { TripOverview } from '@/features/trips/trip-overview/trip-overview';
import type { TripSection } from '@/features/trips/trip-sections';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { Link } from '@/features/workspace/navigation/router';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { useReadyValue } from '@/lib/use-ready-value';
import { createTripNavigation } from './trip-detail-navigation';
import type { LoadedTrip, TripNavigation, TripState } from './trip-detail-types';
import { TripNavigationActions } from './trip-navigation-actions';
import { TripNotFound } from './trip-not-found';
import { TripPageHero } from './trip-page-hero';
import { TripPageShell } from './trip-page-shell';
import { TripSectionNav } from './trip-section-nav';
import { WorkingTripRedirect } from './working-trip-redirect';

export function TripDetailView({
  addDestinationOpen,
  section,
  tripId
}: {
  addDestinationOpen: boolean;
  section: TripSection;
  tripId: Id<'trips'>;
}) {
  const tripState = useTrip(tripId);
  const { isLoading: pageLoading, value: trip } = useReadyValue(
    tripState.exists === false ? undefined : tripState.trip,
    tripId
  );
  const sourceTripId = trip?.proposal?.sourceTripId ?? tripId;
  const { createVersion, proposals } = useTripVersions(sourceTripId, tripState.exists === true);
  const editing = useOpenState(false);
  const roster = useOpenState(false);
  const confirm = useConfirm();
  const navigate = useNavigate();
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  useTripAgentContext(trip, section);

  const ideaFlow = useStartIdeaFlow({
    createVersion: async (title) => {
      if (trip?.proposal) return null;
      const version = await createVersion(title ? { title } : undefined);
      return version ? { proposalId: version.proposalId } : null;
    },
    proposals,
    trip
  });

  if (tripState.exists === false) return <TripNotFound />;

  if (trip?.proposal && proposals !== undefined) {
    return (
      <WorkingTripRedirect
        addDestinationOpen={addDestinationOpen}
        proposals={proposals}
        section={section}
        trip={trip}
      />
    );
  }

  const waitingOnProposalRedirect = Boolean(trip?.proposal && proposals === undefined);
  const showLoading = pageLoading || !trip || waitingOnProposalRedirect;
  const viewerDraft = findViewerDrafts(proposals ?? [], viewerUserId)[0];

  const editDetails = () => {
    if (!trip) return;
    if (trip.permissions.canEdit) editing.openPanel();
    else if (trip.permissions.canPropose) ideaFlow.start({ section: 'overview' });
  };
  const navigation = createTripNavigation({ confirm, ideaFlow, navigate, trip, tripId });

  return (
    <TripPageShell
      body={
        <TripDetailBody
          addDestinationOpen={addDestinationOpen}
          navigation={navigation}
          onEdit={editDetails}
          section={section}
          showLoading={showLoading}
          trip={trip}
          tripState={tripState}
        />
      }
      crumb={<TripDetailCrumb showLoading={showLoading} trip={trip} />}
      hero={
        <TripDetailHero
          onEdit={editDetails}
          roster={roster}
          section={section}
          showLoading={showLoading}
          trip={trip}
          tripId={tripId}
          tripState={tripState}
        />
      }
      isLoading={showLoading}
      nav={
        <TripDetailNav
          navigation={navigation}
          section={section}
          showLoading={showLoading}
          trip={trip}
          tripId={tripId}
        />
      }
      banner={
        <TripDetailBanner
          ideaFlow={ideaFlow}
          navigate={navigate}
          showLoading={showLoading}
          trip={trip}
          viewerDraft={viewerDraft}
        />
      }
    >
      <TripDetailDialogs
        editing={editing}
        ideaFlow={ideaFlow}
        showLoading={showLoading}
        trip={trip}
        update={tripState.update}
      />
    </TripPageShell>
  );
}

function TripDetailBody({
  addDestinationOpen,
  navigation,
  onEdit,
  section,
  showLoading,
  trip,
  tripState
}: {
  addDestinationOpen: boolean;
  navigation: TripNavigation;
  onEdit: () => void;
  section: TripSection;
  showLoading: boolean;
  trip: LoadedTrip | undefined;
  tripState: TripState;
}) {
  if (showLoading || !trip) return <TripOverview isLoading />;
  return (
    <ActiveTripSection
      addDestinationOpen={addDestinationOpen}
      navigation={navigation}
      onEdit={onEdit}
      section={section}
      trip={trip}
      tripState={tripState}
    />
  );
}

function TripDetailCrumb({
  showLoading,
  trip
}: {
  showLoading: boolean;
  trip: LoadedTrip | undefined;
}) {
  if (showLoading || !trip)
    return <PageCrumbNav isLoading inset={false} parent={{ href: '/trips', label: 'All trips' }} />;
  return (
    <PageCrumbNav
      current={trip.name}
      inset={false}
      parent={{ asChild: true, children: <Link to="/trips" />, label: 'All trips' }}
    />
  );
}

function TripDetailHero({
  onEdit,
  roster,
  section,
  showLoading,
  trip,
  tripId,
  tripState
}: {
  onEdit: () => void;
  roster: ReturnType<typeof useOpenState>;
  section: TripSection;
  showLoading: boolean;
  trip: LoadedTrip | undefined;
  tripId: Id<'trips'>;
  tripState: TripState;
}) {
  if (showLoading || !trip) return <TripPageHero isLoading />;
  return (
    <TripPageHero
      actions={
        <TripNavigationActions
          onEdit={onEdit}
          section={section}
          trip={trip}
          tripState={tripState}
        />
      }
      onRosterOpenChange={roster.setOpen}
      retryCover={tripState.retryCover}
      rosterOpen={roster.open}
      trip={trip}
      tripId={tripId}
    />
  );
}

function TripDetailNav({
  navigation,
  section,
  showLoading,
  trip,
  tripId
}: {
  navigation: TripNavigation;
  section: TripSection;
  showLoading: boolean;
  trip: LoadedTrip | undefined;
  tripId: Id<'trips'>;
}) {
  if (showLoading || !trip) return <TripSectionNav isLoading section={section} />;
  return (
    <TripSectionNav onOpen={navigation.openSection} section={section} trip={trip} tripId={tripId} />
  );
}

function TripDetailBanner({
  ideaFlow,
  navigate,
  showLoading,
  trip,
  viewerDraft
}: {
  ideaFlow: ReturnType<typeof useStartIdeaFlow>;
  navigate: ReturnType<typeof useNavigate>;
  showLoading: boolean;
  trip: LoadedTrip | undefined;
  viewerDraft: ReturnType<typeof findViewerDrafts>[number] | undefined;
}) {
  if (showLoading || !trip || trip.proposal || trip.permissions.canEdit) return undefined;
  return (
    <SharedTripBanner
      archived={trip.archivedAt !== null}
      continueDraftTitle={viewerDraft?.title}
      onContinueDraft={
        viewerDraft
          ? () =>
              void navigate(
                ideaCloneHref({ id: viewerDraft.id as Id<'tripProposals'>, sourceTripId: trip.id })
              )
          : undefined
      }
      onStartIdea={trip.permissions.canPropose ? () => ideaFlow.start() : undefined}
    />
  );
}

function TripDetailDialogs({
  editing,
  ideaFlow,
  showLoading,
  trip,
  update
}: {
  editing: ReturnType<typeof useOpenState>;
  ideaFlow: ReturnType<typeof useStartIdeaFlow>;
  showLoading: boolean;
  trip: LoadedTrip | undefined;
  update: TripState['update'];
}) {
  if (showLoading || !trip) return null;
  return (
    <>
      <CreateTripIdeaDialog
        defaultTitle={ideaFlow.titleHint}
        isCreating={ideaFlow.isCreating}
        onCreate={ideaFlow.create}
        onOpenChange={ideaFlow.setDialogOpen}
        open={ideaFlow.dialogOpen}
        sharedTripName={trip.name}
      />
      <ContinueDraftDialog
        onContinue={ideaFlow.continueDraft}
        onOpenChange={ideaFlow.setExistingDraftOpen}
        onStartAnother={ideaFlow.startAnotherIdea}
        open={ideaFlow.existingDraftOpen}
        title={ideaFlow.pendingDraft?.title ?? ''}
      />
      {editing.open && (
        <TripDetailsEditor onClose={editing.closePanel} trip={trip} update={update} />
      )}
    </>
  );
}
