import { createFileRoute, Navigate } from '@tanstack/react-router';
import { defaultIdeaCloneView } from '@/features/ideas/idea-clone/idea-sections';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';

export const Route = createFileRoute('/_workspace/trips/$tripId/ideas/$proposalId/')({
  component: IdeaCloneIndexRoute
});

function IdeaCloneIndexRoute() {
  const { proposalId, tripId } = useResolvedParams(Route.useParams());
  return (
    <Navigate
      params={{ proposalId, tripId, view: defaultIdeaCloneView }}
      replace
      to="/trips/$tripId/ideas/$proposalId/$view"
    />
  );
}
