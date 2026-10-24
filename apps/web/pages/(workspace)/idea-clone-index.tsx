import { defaultIdeaCloneView } from '@/features/ideas/idea-clone/idea-sections';
import { Navigate, useParams } from '@/lib/navigation/router';

export default function IdeaCloneIndexPage() {
  // Keep the references as written; ReferenceProvider canonicalizes them once.
  const { proposalId = '', tripId = '' } = useParams<{ proposalId: string; tripId: string }>();
  return (
    <Navigate
      params={{ proposalId, tripId, view: defaultIdeaCloneView }}
      replace
      to="/trips/$tripId/ideas/$proposalId/$view"
    />
  );
}
