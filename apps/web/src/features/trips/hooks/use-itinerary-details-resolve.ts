import { api } from '@groam/backend/api';
import { toast } from '@groam/ui/components/toast';
import { useAction, useQuery } from 'convex/react';
import { useMemo } from 'react';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { errorMessage } from '@/lib/errors';
import type { DetailsResolveChoice } from '@/types/trips';
import { buildDetailResolutionRows } from './detail-resolution-values';
import { useTripProposalDetail, useTripVersions } from './use-trip-versions';

function asResolutionMedia<T extends { mediaId: string }>(files: T[]) {
  return files.map((file) => ({ ...file, id: file.mediaId }));
}

function useResolutionData({
  change,
  open,
  sourceTripId,
  trip
}: {
  change: ItineraryChange;
  open: boolean;
  sourceTripId: TripDetail['id'];
  trip: TripDetail;
}) {
  const sharedRecord = useQuery(
    api.routes.trips.find.run,
    trip.proposal ? { tripId: sourceTripId } : 'skip'
  );
  const sharedTrip = useMemo(
    () => (sharedRecord ? { ...sharedRecord, groupMemberCount: 0 } : sharedRecord),
    [sharedRecord]
  );
  const hasAttachments = change.fields.some((field) => field.key === 'attachments');
  const queryAttachments = open && hasAttachments;
  const sharedFiles = useQuery(
    api.routes.trips.attachments.list.run,
    queryAttachments ? { tripId: sourceTripId, target: { type: 'trip', id: sourceTripId } } : 'skip'
  );
  const mineFiles = useQuery(
    api.routes.trips.attachments.list.run,
    queryAttachments ? { tripId: trip.id, target: { type: 'trip', id: trip.id } } : 'skip'
  );
  return {
    dataReady:
      Boolean(sharedTrip) &&
      (!hasAttachments || (sharedFiles !== undefined && mineFiles !== undefined)),
    resolveRows: buildDetailResolutionRows({
      change,
      mineAttachments: asResolutionMedia(mineFiles ?? []),
      sharedAttachments: asResolutionMedia(sharedFiles ?? []),
      sharedTrip,
      trip
    }),
    sharedTrip
  };
}

export function useItineraryDetailsResolve({
  change,
  trip
}: {
  change: ItineraryChange;
  trip: TripDetail;
}) {
  const idea = useOptionalIdeaContext();
  const sheet = useOpenState(false);
  const pending = useAsyncPending();
  const sourceTripId = trip.proposal?.sourceTripId ?? trip.id;
  const hasContextProposal = Boolean(idea?.proposal);
  const { proposals } = useTripVersions(
    sourceTripId,
    trip.proposal !== null && !hasContextProposal
  );
  const proposalId =
    idea?.proposal?.id ?? proposals?.find((proposal) => proposal.workingTripId === trip.id)?.id;
  const fetched = useTripProposalDetail(hasContextProposal ? undefined : proposalId);
  const proposal = idea?.proposal ?? fetched;
  const { dataReady, resolveRows, sharedTrip } = useResolutionData({
    change,
    open: sheet.open,
    sourceTripId,
    trip
  });
  const rebase = useAction(api.routes.trips.versions.rebase.run);
  const fieldKeys = resolveRows.map(({ key }) => key);
  const applyChoices = async (choices: Record<string, DetailsResolveChoice>) => {
    if (!proposalId || !sharedTrip || !dataReady || fieldKeys.some((key) => !choices[key]))
      return false;
    return (
      (await pending.run(async () => {
        try {
          const result = await rebase({
            proposalId,
            resolutions: [],
            details: {
              expectedSharedUpdatedAt: sharedTrip.lastUpdatedAt,
              expectedWorkingUpdatedAt: trip.lastUpdatedAt,
              choices: fieldKeys.map((key) => ({
                key: key as NonNullable<
                  Parameters<typeof rebase>[0]['details']
                >['choices'][number]['key'],
                choice: choices[key] ?? 'mine'
              }))
            }
          });
          if (result.kind !== 'applied') {
            toast.error(
              'Other itinerary conflicts need a decision. Open the comparison to review them together.'
            );
            return false;
          }
          return true;
        } catch (error) {
          toast.error(errorMessage(error, 'Unable to apply the selected details'));
          return false;
        }
      })) ?? false
    );
  };
  return {
    applyChoices,
    ideaBranchName: proposal?.title ?? proposal?.ideaName ?? 'This idea',
    canResolve: Boolean(proposal?.canRebase),
    dataReady,
    hasDetailConflicts: Boolean(
      proposal?.conflicts.some((conflict) => conflict.entity === 'details')
    ),
    fieldKeys,
    open: sheet.open,
    otherConflicts: (proposal?.conflicts ?? []).filter((conflict) => conflict.entity !== 'details')
      .length,
    pending: pending.isPending,
    proposalId,
    resolveRows,
    setOpen: sheet.setOpen,
    revision: `${trip.lastUpdatedAt}:${sharedTrip?.lastUpdatedAt ?? 'loading'}`,
    sharedBranchName: sharedTrip?.name ?? 'Current group trip'
  };
}
