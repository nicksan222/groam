import type { Id } from '@groam/backend/data-model';
import { ResearchThreadView } from '@/features/research/research-thread/research-thread-view';
import { useParams } from '@/features/workspace/navigation/router';

export default function ResearchThreadPage() {
  const { researchId = '', tripId = '' } = useParams<{ researchId: string; tripId: string }>();
  return (
    <ResearchThreadView
      researchId={researchId as Id<'discussions'>}
      tripId={tripId as Id<'trips'>}
    />
  );
}
