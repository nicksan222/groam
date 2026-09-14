import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import { Navigate } from '@tanstack/react-router';
import { FileDiff } from 'lucide-react';
import { ideaOpenHref } from '@/features/ideas/idea-href';
import { useTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { Link } from '@/features/workspace/navigation/router';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';

export function IdeaDetailView({ proposalId }: { proposalId: Id<'tripProposals'> }) {
  const { proposal } = useTripVersion(proposalId);
  const viewerUserId = useOptionalWorkspace()?.session.user.id;

  if (proposal === null) {
    return (
      <EmptyScreen
        buttonRaw={
          <Button asChild variant="outline">
            <Link to="/ideas">Back to ideas</Link>
          </Button>
        }
        description="It may have been removed, or you do not have access to this trip."
        headline="Idea not found"
        icon={FileDiff}
      />
    );
  }

  if (proposal === undefined) {
    return <PageLoading label="Loading idea…" />;
  }

  const href = ideaOpenHref(proposal, viewerUserId);
  if (!('params' in href) || !('search' in href)) {
    return <Navigate params={href.params} replace to={href.to} />;
  }
  return <Navigate params={href.params} replace search={href.search} to={href.to} />;
}
