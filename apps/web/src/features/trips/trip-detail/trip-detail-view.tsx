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
import type { TripNavigation } from './trip-detail-types';
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

  const openSection = (nextSection: TripSection) => {
    void navigate({
      params: { section: nextSection, tripId },
      search: {},
      to: '/trips/$tripId/$section'
    });
  };
  const editDetails = () => {
    if (!trip) return;
    if (trip.permissions.canEdit) editing.openPanel();
    else if (trip.permissions.canPropose) ideaFlow.start({ section: 'overview' });
  };
  const navigation: TripNavigation = {
    closeAddDestination: () => {
      void navigate({
        params: { section: 'itinerary', tripId },
        replace: true,
        search: {},
        to: '/trips/$tripId/$section'
      });
    },
    openAddDestination: () => {
      if (!trip) return;
      if (!trip.permissions.canEdit && trip.permissions.canPropose) {
        ideaFlow.start({ addDestination: true, section: 'itinerary' });
        return;
      }
      void (async () => {
        if (
          trip.departureTransfer &&
          !(await confirm(
            'Clear return travel?',
            'Adding another stop will clear the existing return travel details.'
          ))
        ) {
          return;
        }
        void navigate({
          params: { section: 'itinerary', tripId },
          search: { addDestination: true },
          to: '/trips/$tripId/$section'
        });
      })();
    },
    openSection
  };

  return (
    <TripPageShell
      body={
        showLoading ? (
          <TripOverview isLoading />
        ) : (
          <ActiveTripSection
            addDestinationOpen={addDestinationOpen}
            navigation={navigation}
            onEdit={editDetails}
            section={section}
            trip={trip}
            tripState={tripState}
          />
        )
      }
      crumb={
        showLoading ? (
          <PageCrumbNav isLoading inset={false} parent={{ href: '/trips', label: 'All trips' }} />
        ) : (
          <PageCrumbNav
            current={trip.name}
            inset={false}
            parent={{
              asChild: true,
              children: <Link to="/trips" />,
              label: 'All trips'
            }}
          />
        )
      }
      hero={
        showLoading ? (
          <TripPageHero isLoading />
        ) : (
          <TripPageHero
            actions={
              <TripNavigationActions
                onEdit={editDetails}
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
        )
      }
      isLoading={showLoading}
      nav={
        showLoading ? (
          <TripSectionNav isLoading section={section} />
        ) : (
          <TripSectionNav onOpen={openSection} section={section} trip={trip} tripId={tripId} />
        )
      }
      banner={
        showLoading || !trip || trip.proposal || trip.permissions.canEdit ? undefined : (
          <SharedTripBanner
            archived={trip.archivedAt !== null}
            continueDraftTitle={viewerDraft?.title}
            onContinueDraft={
              viewerDraft
                ? () => {
                    void navigate(ideaCloneHref({ id: viewerDraft.id, sourceTripId: trip.id }));
                  }
                : undefined
            }
            onStartIdea={trip.permissions.canPropose ? () => ideaFlow.start() : undefined}
          />
        )
      }
    >
      {!showLoading && (
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
            <TripDetailsEditor onClose={editing.closePanel} trip={trip} update={tripState.update} />
          )}
        </>
      )}
    </TripPageShell>
  );
}
