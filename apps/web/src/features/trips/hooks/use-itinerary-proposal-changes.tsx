import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import type { ItineraryChange } from './itinerary-proposal-changes';
import { useTripProposalDetail, useTripVersions } from './use-trip-versions';
import type { TripDetail } from './use-trips';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type ItineraryProposalChangesValue = {
  byKey: Map<string, ItineraryChange> | null;
  changes: ItineraryChange[] | null;
};

const ItineraryProposalChangesContext = createContext<ItineraryProposalChangesValue>({
  byKey: null,
  changes: null
});

function useItineraryProposalChanges(trip: TripDetail) {
  const idea = useOptionalIdeaContext();
  const isIdea = trip.proposal !== null;
  const hasContextProposal = Boolean(idea?.proposal);
  const { proposals } = useTripVersions(
    trip.proposal?.sourceTripId ?? trip.id,
    isIdea && !hasContextProposal
  );
  const proposalId = hasContextProposal
    ? idea?.proposal?.id
    : isIdea
      ? proposals?.find((proposal) => proposal.workingTripId === trip.id)?.id
      : undefined;
  const fetched = useTripProposalDetail(hasContextProposal ? undefined : proposalId);
  if (!isIdea) return null;
  return (idea?.proposal ?? fetched)?.changes ?? null;
}

export function ItineraryProposalChangesProvider({
  children,
  trip
}: {
  children: ReactNode;
  trip: TripDetail;
}) {
  const changes = useItineraryProposalChanges(trip);
  const value = useMemo<ItineraryProposalChangesValue>(
    () => ({
      byKey: changes ? new Map(changes.map((change) => [change.key, change])) : null,
      changes
    }),
    [changes]
  );
  return (
    <ItineraryProposalChangesContext.Provider value={value}>
      {children}
    </ItineraryProposalChangesContext.Provider>
  );
}

export function useItineraryChange(key: null | string | undefined) {
  const { byKey } = useContext(ItineraryProposalChangesContext);
  if (!byKey || !key) return null;
  return byKey.get(key) ?? null;
}

export function useItineraryProposalChangeList() {
  return useContext(ItineraryProposalChangesContext).changes;
}
