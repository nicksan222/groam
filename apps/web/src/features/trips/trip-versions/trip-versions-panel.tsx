import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { useNavigate } from '@tanstack/react-router';
import { FileDiff, Plus } from 'lucide-react';
import { type ReactNode, useCallback } from 'react';
import { matchesIdeaStatus } from '@/features/ideas/hooks/idea-list-filter';
import { ideaCreateCta, ideasListDescription } from '@/features/ideas/idea-glossary';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { IdeaEmptyState } from '@/features/ideas/idea-list/idea-empty-state';
import { IdeaList } from '@/features/ideas/idea-list/idea-list';
import { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { VersionRow } from './version-row';

export function TripVersionsPanel({
  onStartIdea,
  startingIdea = false,
  trailing,
  trip
}: {
  onStartIdea?: () => void;
  startingIdea?: boolean;
  trailing?: ReactNode;
  trip: TripDetail;
}) {
  const { proposals } = useTripVersions(trip.id);
  const navigate = useNavigate();
  const viewerUserId = useOptionalWorkspace()?.session.user.id;

  const openClone = useCallback(
    (proposal: { id: Id<'tripProposals'> }, addDestination = false) => {
      void navigate(
        ideaCloneHref({ id: proposal.id, sourceTripId: trip.id }, 'overview', { addDestination })
      );
    },
    [navigate, trip.id]
  );

  const pending =
    proposals?.filter((proposal) => matchesIdeaStatus(proposal.status, 'pending')).length ?? 0;
  const canStart = Boolean(onStartIdea && trip.permissions.canPropose && !trip.proposal);

  return (
    <TripSectionPanel
      badge={`${pending} open`}
      description={ideasListDescription}
      icon={FileDiff}
      title="Ideas"
      trailing={
        <div className="flex flex-wrap justify-end gap-2">
          {trailing}
          {canStart ? (
            <Button
              data-testid={testIds.startIdea}
              disabled={startingIdea}
              onClick={onStartIdea}
              size="sm"
            >
              <Plus />
              {ideaCreateCta}
            </Button>
          ) : undefined}
        </div>
      }
    >
      {!proposals ? (
        <IdeaList
          emptyFilterMessage={() => 'No ideas yet.'}
          isLoading
          proposals={[]}
          showTripName={false}
        />
      ) : proposals.length === 0 ? (
        <IdeaEmptyState canStart={canStart} onStart={onStartIdea} originalName={trip.name} />
      ) : (
        <Shell.Reveal>
          <IdeaList
            emptyFilterMessage={(filter) =>
              filter === 'pending'
                ? 'No open ideas.'
                : filter === 'merged'
                  ? 'No settled ideas.'
                  : 'No ideas yet.'
            }
            headingLevel="h3"
            proposals={proposals}
            renderItem={(proposal) => (
              <VersionRow
                onOpen={() =>
                  void navigate(
                    ideaCloneHref({ id: proposal.id, sourceTripId: trip.id }, 'compare')
                  )
                }
                onOpenCopy={() => openClone(proposal)}
                proposal={proposal}
                sourceTripId={trip.id}
                viewerUserId={viewerUserId}
              />
            )}
            viewerUserId={viewerUserId}
          />
        </Shell.Reveal>
      )}
    </TripSectionPanel>
  );
}
