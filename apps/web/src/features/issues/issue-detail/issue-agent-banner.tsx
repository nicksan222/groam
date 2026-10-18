import { assistantAgents } from '@groam/ai/agents';
import { agentRunCopy } from '@groam/ai/backend/runs/copy';
import { AgentRunBanner } from '@groam/ai/ui/runs/agent-run-banner';
import type { Id } from '@groam/backend/data-model';
import { agentRunHref } from '@/features/agents/agent-run/agent-run-href';
import {
  useAgentRunControls,
  useAgentRunEvents,
  useIssueAgentRun,
  useStartQueuedAssignRuns
} from '@/features/agents/hooks/use-agent-run';
import { useCancelWait, useRunWait } from '@/features/agents/hooks/use-agent-waits';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

export function IssueAgentBanner({ issueId }: { issueId: Id<'tripIssues'> }) {
  const run = useIssueAgentRun(issueId);
  const { events } = useAgentRunEvents(run?.id);
  const { retry, stop } = useAgentRunControls();
  useStartQueuedAssignRuns(run ? [run] : undefined);
  const wait = useRunWait(run?.status === 'waiting' ? run.id : undefined);
  const cancelWait = useCancelWait();
  if (!run) return null;

  return (
    <AgentRunBanner
      agentLabel={assistantAgents.issue.label}
      cancelWaitTestId={testIds.agentWaitCancel}
      eventTestId={testIds.agentEvent}
      events={events}
      onCancelWait={wait ? () => cancelWait(wait.id) : undefined}
      onRetry={() => retry({ runId: run.id })}
      onStop={() => stop({ runId: run.id })}
      retryTestId={testIds.agentRetryFromZero}
      run={run}
      stopTestId={testIds.agentStop}
      testId={testIds.issueAgentBanner}
      viewAgent={
        <Link {...agentRunHref(assistantAgents.issue.id, run.id)}>{agentRunCopy.viewAgent}</Link>
      }
      wait={wait ?? null}
    />
  );
}
