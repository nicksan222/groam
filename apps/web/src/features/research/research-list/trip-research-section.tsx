import type { Id } from '@groam/backend/data-model';
import { useCreateResearch } from '@/features/research/hooks/use-research-actions';
import { useTripResearches } from '@/features/research/hooks/use-trip-researches';
import { CreateResearchDialog } from '@/features/research/research-create/create-research-dialog';
import { ResearchList } from '@/features/research/research-list/research-list';
import { useTripCreateRequest } from '@/features/trips/hooks/use-trip-create-request';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { useNavigate } from '@/lib/navigation/router';

/** A trip's Research tab: its researches, and the dialog that starts a new one. */
export function TripResearchSection({
  archived = false,
  tripId
}: {
  archived?: boolean;
  tripId: Id<'trips'>;
}) {
  const { isLoading, researches } = useTripResearches(tripId);
  const createResearch = useCreateResearch(tripId);
  const dialog = useOpenState(false);
  const navigate = useNavigate();
  useTripCreateRequest('research', dialog.openPanel);

  return (
    <TripSectionPanel stretch title="Research">
      <ResearchList
        isLoading={isLoading}
        onCreate={archived ? undefined : dialog.openPanel}
        onOpen={(research) =>
          void navigate({
            params: { researchId: research.shortId, tripId },
            to: '/trips/$tripId/research/$researchId'
          })
        }
        researches={researches}
      />
      <CreateResearchDialog
        onClose={dialog.closePanel}
        onSubmit={(input) =>
          void createResearch(input).then((id) => {
            if (!id) return;
            dialog.closePanel();
            void navigate({
              params: { researchId: id, tripId },
              to: '/trips/$tripId/research/$researchId'
            });
          })
        }
        open={dialog.open}
      />
    </TripSectionPanel>
  );
}
