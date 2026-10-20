import { Bot } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { EntityParticipationBoundary } from '@/features/trips/trip-detail/entity-participation-boundary';
import { Link } from '@/features/workspace/navigation/router';
import { ParticipatingAgentRunView } from './participating-agent-run-view';

export function AgentRunView({ agentId, runId }: { agentId: string; runId: string }) {
  return (
    <EntityParticipationBoundary
      reference={runId}
      table="agentRuns"
      loadingLabel="Loading run…"
      missing={
        <EmptyScreen
          buttonRaw={
            <Button asChild variant="outline">
              <Link to="/agents">Back to agents</Link>
            </Button>
          }
          description="This run is missing, or you do not have access to it."
          headline="Run not found"
          icon={Bot}
        />
      }
    >
      <ParticipatingAgentRunView agentId={agentId} runId={runId} />
    </EntityParticipationBoundary>
  );
}
