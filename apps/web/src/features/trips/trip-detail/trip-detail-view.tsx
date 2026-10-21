import type { Id } from '@groam/backend/data-model';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { cn } from '@groam/ui/lib/utils';
import { useStartIdeaFlow } from '@/features/trips/hooks/use-start-idea-flow';
import { useTripAgentContext } from '@/features/trips/hooks/use-trip-agent-context';
import { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import { useTrip } from '@/features/trips/hooks/use-trips';
import { ActiveTripSection } from '@/features/trips/trip-detail/active-trip-section';
import { TripDetailsEditor } from '@/features/trips/trip-detail/trip-details-editor';
import { ContinueDraftDialog } from '@/features/trips/trip-ideas/continue-draft-dialog';
import { CreateTripIdeaDialog } from '@/features/trips/trip-ideas/create-trip-idea-dialog';
import type { TripSection } from '@/features/trips/trip-sections';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import { useNavigate } from '@/lib/navigation/router';
import { useReadyValue } from '@/lib/use-ready-value';
import { createTripNavigation } from './trip-detail-navigation';
import { tripDetailRedirect } from './trip-detail-redirect';
import type { LoadedTrip, TripState } from './trip-detail-types';
import { TripJoinPaywall } from './trip-join-paywall';
import { TripSectionNav } from './trip-section-nav';
import { TripToolbar } from './trip-toolbar';
import { TripToolbarSkeleton } from './trip-toolbar-skeleton';

export function TripDetailView({
  addDestinationOpen,
  day,
  section,
  tripId,
  tripReference = tripId
}: {
  addDestinationOpen: boolean;
  day?: number;
  section: TripSection;
  tripId: Id<'trips'>;
  /** The trip as the URL writes it; section switches navigate with it so the page stays mounted. */
  tripReference?: string;
}) {
  const tripState = useTrip(tripId);
  const { isLoading: pageLoading, value: trip } = useReadyValue(
    tripState.exists === false ? undefined : tripState.trip,
    tripId
  );
  // Unpaid members only see the paywall; skip every planning subscription for them.
  const participating = tripState.trip?.canParticipate === true;
  const sourceTripId = trip?.proposal?.sourceTripId ?? tripId;
  const { createVersion, proposals } = useTripVersions(sourceTripId, participating);
  const editing = useOpenState(false);
  const confirm = useConfirm();
  const navigate = useNavigate();
  useTripAgentContext(participating ? trip : undefined, section);

  const ideaFlow = useStartIdeaFlow({
    createVersion: async (title) => {
      if (trip?.proposal) return null;
      const version = await createVersion(title ? { title } : undefined);
      return version ? { proposalId: version.proposalId } : null;
    },
    proposals,
    trip
  });

  if (trip && !trip.canParticipate) return <TripJoinPaywall trip={trip} tripState={tripState} />;

  const redirect = tripDetailRedirect({
    addDestinationOpen,
    day,
    exists: tripState.exists,
    proposals,
    section,
    trip,
    tripReference
  });
  if (redirect) return redirect;

  const waitingOnProposalRedirect = Boolean(trip?.proposal && proposals === undefined);
  const loaded = pageLoading || !trip || waitingOnProposalRedirect ? undefined : trip;

  const editDetails = () => {
    if (!loaded) return;
    if (loaded.permissions.canEdit) editing.openPanel();
    else if (loaded.permissions.canPropose) ideaFlow.start({ section: 'overview' });
  };
  const fullBleed = Boolean(loaded) && !loaded?.proposal && section === 'board';
  const navigation = createTripNavigation({
    confirm,
    ideaFlow,
    navigate,
    trip,
    tripId: tripReference
  });

  return (
    <Shell className="trip-page-shell">
      <Shell.BannerLayout className={loaded ? 'trip-page-ready' : undefined}>
        {loaded ? (
          <TripToolbar
            onEdit={editDetails}
            onStartIdea={() => ideaFlow.start()}
            section={section}
            startingIdea={ideaFlow.isCreating}
            trip={loaded}
            tripState={tripState}
          />
        ) : (
          <TripToolbarSkeleton />
        )}
        {loaded ? (
          <TripSectionNav onOpen={navigation.openSection} section={section} tripId={loaded.id} />
        ) : (
          <TripSectionNav isLoading section={section} />
        )}
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col',
            // The full-bleed board scrolls inside itself; every other tab keeps its full height so
            // its bottom padding stays below the content.
            fullBleed ? 'px-0 md:min-h-0' : 'shrink-0 px-6 py-5'
          )}
          data-slot="trip-board-area"
        >
          {loaded ? (
            <ActiveTripSection
              addDestinationOpen={addDestinationOpen}
              day={day}
              navigation={navigation}
              onStartPackingIdea={(claimGear) => ideaFlow.start({ claimGear, section: 'packing' })}
              onStartVersion={() => ideaFlow.start()}
              section={section}
              startingIdea={ideaFlow.isCreating}
              trip={loaded}
              tripState={tripState}
            />
          ) : (
            <PageLoading label="Loading trip…" />
          )}
        </div>
      </Shell.BannerLayout>
      <TripDetailDialogs
        editing={editing}
        ideaFlow={ideaFlow}
        trip={loaded}
        update={tripState.update}
      />
    </Shell>
  );
}

function TripDetailDialogs({
  editing,
  ideaFlow,
  trip,
  update
}: {
  editing: ReturnType<typeof useOpenState>;
  ideaFlow: ReturnType<typeof useStartIdeaFlow>;
  trip: LoadedTrip | undefined;
  update: TripState['update'];
}) {
  if (!trip) return null;
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
