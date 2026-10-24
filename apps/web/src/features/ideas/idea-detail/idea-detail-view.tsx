import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import type { Id } from '@groam/backend/data-model';
import { FileDiff } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import { ideaOpenHref } from '@/features/ideas/idea-href';
import { useTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { Link } from '@/features/workspace/navigation/router';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { Navigate } from '@/lib/navigation/router';

export function IdeaDetailView({ proposalId }: { proposalId: Id<'tripProposals'> }) {
  const { proposal } = useTripVersion(proposalId);
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  // A waypoint: it opens the idea inside its trip, which then tells Groam AI what it shows.
  useSetAgentContext({
    capabilities: [],
    data: { found: proposal === undefined ? null : proposal !== null, proposalId },
    description:
      proposal === null
        ? 'This idea was not found; it may have been removed or be out of reach. Nothing to act on here.'
        : 'Opening this idea inside its trip. Nothing to act on here yet.',
    key: `idea:${proposalId}`,
    title: 'Idea'
  });

  if (proposal === null) {
    return (
      <EmptyScreen
        buttonRaw={
          <Button asChild variant="outline">
            <Link to="/">Back to Home</Link>
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
