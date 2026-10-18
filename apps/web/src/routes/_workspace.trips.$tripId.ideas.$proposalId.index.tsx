import { createFileRoute, Navigate } from '@tanstack/react-router';
import { defaultIdeaCloneView } from '@/features/ideas/idea-clone/idea-sections';

export const Route = createFileRoute('/_workspace/trips/$tripId/ideas/$proposalId/')({
  component: IdeaCloneIndexRoute
});

function IdeaCloneIndexRoute() {
  // Keep the references as written; ReferenceProvider canonicalizes them once.
  const { proposalId, tripId } = Route.useParams();
  return (
    <Navigate
      params={{ proposalId, tripId, view: defaultIdeaCloneView }}
      replace
      to="/trips/$tripId/ideas/$proposalId/$view"
    />
  );
}
