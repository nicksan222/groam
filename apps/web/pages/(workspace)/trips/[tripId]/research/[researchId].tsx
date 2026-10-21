import type { Id } from '@groam/backend/data-model';
import { ResearchThreadView } from '@/features/research/research-thread/research-thread-view';
import { useParams } from '@/features/workspace/navigation/router';

export default function ResearchThreadPage() {
  const { researchId = '' } = useParams<{ researchId: string }>();
  return <ResearchThreadView researchId={researchId as Id<'discussions'>} />;
}
