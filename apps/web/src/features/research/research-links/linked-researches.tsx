import type { Id } from '@groam/backend/data-model';
import { useNavigate } from '@tanstack/react-router';
import { useCreateLinkedResearch } from '@/features/research/hooks/use-create-linked-research';
import { useLinkedResearches } from '@/features/research/hooks/use-linked-researches';
import { useLinkResearch } from '@/features/research/hooks/use-research-actions';
import { CreateResearchDialog } from '@/features/research/research-create/create-research-dialog';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import type { ResearchLinkTarget } from '@/types/research';
import { LinkedResearchesSection } from './linked-researches-section';

/** The Research section of an issue or idea: linked researches, link one, or start a new one. */
export function LinkedResearches({
  target,
  tripId
}: {
  target: ResearchLinkTarget;
  tripId: Id<'trips'>;
}) {
  const { available, linked } = useLinkedResearches(tripId, target);
  const link = useLinkResearch();
  const createAndLink = useCreateLinkedResearch(tripId, target);
  const dialog = useOpenState(false);
  const navigate = useNavigate();

  return (
    <div className="border-t border-border/40 py-3">
      <LinkedResearchesSection
        available={available}
        linked={linked}
        onLink={(research) => void link(research.id as Id<'discussions'>, target)}
        onNew={dialog.openPanel}
        onOpen={(research) =>
          void navigate({
            params: { researchId: research.shortId, tripId },
            to: '/trips/$tripId/research/$researchId'
          })
        }
      />
      <CreateResearchDialog
        onClose={dialog.closePanel}
        onSubmit={(input) =>
          void createAndLink(input).then((done) => {
            if (done) dialog.closePanel();
          })
        }
        open={dialog.open}
      />
    </div>
  );
}
