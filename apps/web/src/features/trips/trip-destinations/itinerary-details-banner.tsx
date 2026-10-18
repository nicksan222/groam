import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import { useItineraryDetailsResolve } from '@/features/trips/hooks/use-itinerary-details-resolve';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { ItineraryDetailsChangeCard } from '@/features/trips/itinerary-proposal-highlight/itinerary-details-change-card';
import { ItineraryDetailsResolveSheet } from '@/features/trips/itinerary-proposal-highlight/itinerary-details-resolve-sheet';

export function ItineraryDetailsBanner({
  change,
  trip
}: {
  change: ItineraryChange | null;
  trip: TripDetail;
}) {
  if (!change) return null;
  return <ItineraryDetailsBannerContent change={change} trip={trip} />;
}

function ItineraryDetailsBannerContent({
  change,
  trip
}: {
  change: ItineraryChange;
  trip: TripDetail;
}) {
  const resolve = useItineraryDetailsResolve({ change, trip });
  if (!resolve.hasDetailConflicts && !resolve.open) return null;

  return (
    <>
      <ItineraryDetailsChangeCard
        canResolve={resolve.canResolve}
        onResolve={() => resolve.setOpen(true)}
        pending={resolve.pending}
        change={change}
      />
      <ItineraryDetailsResolveSheet
        dataReady={resolve.dataReady}
        applyChoices={resolve.applyChoices}
        canResolve={resolve.canResolve}
        fieldKeys={resolve.fieldKeys}
        ideaBranchName={resolve.ideaBranchName}
        onOpenChange={resolve.setOpen}
        open={resolve.open}
        otherConflicts={resolve.otherConflicts}
        pending={resolve.pending}
        proposalId={resolve.proposalId}
        resolveRows={resolve.resolveRows}
        revision={resolve.revision}
        sharedBranchName={resolve.sharedBranchName}
        sourceTripId={trip.proposal?.sourceTripId ?? trip.id}
      />
    </>
  );
}
