import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { useNavigate } from '@tanstack/react-router';
import { Plus, Search } from 'lucide-react';
import { useCreateResearch } from '@/features/research/hooks/use-research-actions';
import { useTripResearches } from '@/features/research/hooks/use-trip-researches';
import { CreateResearchDialog } from '@/features/research/research-create/create-research-dialog';
import { ResearchList } from '@/features/research/research-list/research-list';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { testIds } from '@/lib/test-ids';

/** A trip's Research tab: its researches, and the dialog that starts a new one. */
export function ResearchListView({
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
  const unread = researches.filter((research) => research.unread).length;

  return (
    <TripSectionPanel
      badge={unread > 0 ? `${unread} unread` : `${researches.length} total`}
      description="Links and notes the group collects about one subject."
      icon={Search}
      title="Research"
      trailing={
        archived ? null : (
          <Button data-testid={testIds.researchCreate} onClick={dialog.openPanel} size="sm">
            <Plus />
            New research
          </Button>
        )
      }
    >
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
