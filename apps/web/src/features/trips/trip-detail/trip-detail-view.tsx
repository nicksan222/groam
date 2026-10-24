import type { Id } from '@groam/backend/data-model';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useTripPolls } from '@/features/polls/hooks/use-polls';
import { useRememberTrip } from '@/features/trips/hooks/use-remember-trip';
import { useStartIdeaFlow } from '@/features/trips/hooks/use-start-idea-flow';
import { useTripAgentContext } from '@/features/trips/hooks/use-trip-agent-context';
import { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import { useTrip } from '@/features/trips/hooks/use-trips';
import { ActiveTripSection } from '@/features/trips/trip-detail/active-trip-section';
import { TripDetailsEditor } from '@/features/trips/trip-detail/trip-details-editor';
import { ContinueDraftDialog } from '@/features/trips/trip-ideas/continue-draft-dialog';
import { CreateTripIdeaDialog } from '@/features/trips/trip-ideas/create-trip-idea-dialog';
import {
  type TripTabSection,
  tripSectionConfig,
  tripSectionTitle
} from '@/features/trips/trip-sections';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useReadyValue } from '@/lib/use-ready-value';
import { tripDetailRedirect } from './trip-detail-redirect';
import type { LoadedTrip, TripState } from './trip-detail-types';
import { TripJoinPaywall } from './trip-join-paywall';
import { TripPageShell } from './trip-page-shell';
import { TripSectionHeader } from './trip-section-header';

export function TripDetailView({
  day,
  section,
  tripId
}: {
  day?: number;
  section: TripTabSection;
  tripId: Id<'trips'>;
}) {
  const tripState = useTrip(tripId);
  useRememberTrip(tripState.trip);
  useDocumentTitle(
    tripState.trip ? `${tripSectionTitle(section)} · ${tripState.trip.name}` : undefined
  );
  const { isLoading: pageLoading, value: trip } = useReadyValue(
    tripState.exists === false ? undefined : tripState.trip,
    tripId
  );
  // Unpaid members only see the paywall; skip every planning subscription for them.
  const participating = tripState.trip?.canParticipate === true;
  const sourceTripId = trip?.proposal?.sourceTripId ?? tripId;
  const { createVersion, proposals } = useTripVersions(sourceTripId, participating);
  const editing = useOpenState(false);
  // Polls page in once here, for the Polls section and for the assistant's view of it.
  const pollFeed = useTripPolls(participating && section === 'polls' ? tripId : undefined);
  useTripAgentContext(participating ? trip : undefined, section, pollFeed.polls);

  const ideaFlow = useStartIdeaFlow({
    createVersion: async (title) => {
      if (trip?.proposal) return null;
      const version = await createVersion(title ? { title } : undefined);
      return version ? { proposalId: version.proposalId } : null;
    },
    proposals,
    trip
  });

  if (trip && !trip.canParticipate) return <TripJoinPaywall trip={trip} />;

  const redirect = tripDetailRedirect({ exists: tripState.exists, proposals, trip });
  if (redirect) return redirect;

  const waitingOnProposalRedirect = Boolean(trip?.proposal && proposals === undefined);
  const loaded = pageLoading || !trip || waitingOnProposalRedirect ? undefined : trip;

  const editDetails = () => {
    if (!loaded) return;
    if (loaded.permissions.canEdit) editing.openPanel();
    else if (loaded.permissions.canPropose) ideaFlow.start({ section: 'overview' });
  };
  const fullBleed =
    Boolean(loaded) && !loaded?.proposal && tripSectionConfig[section].layout === 'fill';
  return (
    <TripPageShell
      body={
        loaded ? (
          <ActiveTripSection
            day={day}
            onStartCalendarIdea={(addActivity) =>
              ideaFlow.start({
                addActivity,
                section: 'calendar',
                titleHint: `Add ${addActivity.input.title}`
              })
            }
            onStartPackingIdea={(claimGear) => ideaFlow.start({ claimGear, section: 'packing' })}
            onStartVersion={() => ideaFlow.start()}
            pollFeed={pollFeed}
            section={section}
            startingIdea={ideaFlow.isCreating}
            trip={loaded}
          />
        ) : (
          <PageLoading label="Loading trip…" />
        )
      }
      fullBleed={fullBleed}
      header={
        loaded ? (
          <TripSectionHeader
            onEdit={editDetails}
            // Plan's idea edits the itinerary, so the working copy opens on it.
            onStartIdea={() => ideaFlow.start(ideaStartFor(section))}
            section={section}
            startingIdea={ideaFlow.isCreating}
            trip={loaded}
            tripState={tripState}
          />
        ) : null
      }
    >
      <TripDetailDialogs
        editing={editing}
        ideaFlow={ideaFlow}
        trip={loaded}
        update={tripState.update}
      />
    </TripPageShell>
  );
}

/** Where an idea opens: Plan's and Calendar's on the itinerary, Packing's on the packing list. */
function ideaStartFor(section: TripTabSection) {
  if (section === 'plan' || section === 'calendar') return { section: 'itinerary' } as const;
  if (section === 'packing') return { section: 'packing' } as const;
  return {};
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
