import {
  canRerunIssueAgent,
  canRetryAgentRunFromZero,
  isActiveAgentRun
} from '@groam/ai-contracts/agents/runs/roster';
import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { toast } from '@groam/ui/components/toast';
import { Copy, Square } from 'lucide-react';
import { useState } from 'react';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { Link } from '@/features/workspace/navigation/router';
import { errorMessage } from '@/lib/errors';
import { testIds } from '@/lib/test-ids';
import { AgentRerunButton } from './agent-rerun-button';

export function AgentRunToolbar({
  onRetry,
  onStop,
  run
}: {
  onRetry: (runId: AgentRun['id']) => Promise<unknown> | unknown;
  onStop?: (runId: AgentRun['id']) => Promise<unknown> | unknown;
  run: AgentRun;
}) {
  const [stopping, setStopping] = useState(false);
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button
        aria-label="Copy run ID"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(run.shortId ?? run.id);
            toast.success('Run ID copied');
          } catch {
            toast.error('Could not copy the run ID. You can select it in Run details.');
          }
        }}
        size="sm"
        variant="outline"
      >
        <Copy aria-hidden />
        Copy ID
      </Button>
      {run.surface === 'chat' && run.discussionId ? (
        <Button asChild size="sm" variant="outline">
          <Link params={{ discussionId: run.discussionId }} to="/chat/$discussionId">
            Open chat
          </Link>
        </Button>
      ) : null}
      {onStop && isActiveAgentRun(run) ? (
        <Button
          aria-busy={stopping}
          data-testid={testIds.agentStop}
          disabled={stopping}
          onClick={async () => {
            setStopping(true);
            try {
              await onStop(run.id);
            } catch (error: unknown) {
              toast.error(errorMessage(error, 'Unable to stop this run'));
            } finally {
              setStopping(false);
            }
          }}
          size="sm"
          variant="outline"
        >
          {stopping ? <Spinner aria-hidden /> : <Square aria-hidden />}
          {stopping ? 'Stopping…' : 'Stop'}
        </Button>
      ) : null}
      {canRetryAgentRunFromZero(run) ? (
        <AgentRerunButton
          label="Retry from zero"
          onRerun={() => onRetry(run.id)}
          testId={testIds.agentRetryFromZero}
        />
      ) : null}
      {canRerunIssueAgent(run) ? (
        <AgentRerunButton onRerun={() => onRetry(run.id)} testId={testIds.agentRerun} />
      ) : null}
    </div>
  );
}
