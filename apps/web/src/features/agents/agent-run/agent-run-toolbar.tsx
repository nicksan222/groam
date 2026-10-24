import {
  canRerunIssueAgent,
  canRetryAgentRunFromZero,
  isActiveAgentRun
} from '@groam/ai/backend/runs/roster';
import { Settings2, Square } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import Timeline from '@groam/ui/components/timeline';
import { toast } from '@groam/ui/components/toast';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { chatHref } from '@/features/discussions/chat/chat-href';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { AgentRerunButton } from './agent-rerun-button';

export function AgentRunToolbar({
  onRetry,
  onStop,
  providerError = false,
  run
}: {
  onRetry: (runId: AgentRun['id']) => Promise<unknown> | unknown;
  onStop?: (runId: AgentRun['id']) => Promise<unknown> | unknown;
  providerError?: boolean;
  run: AgentRun;
}) {
  const stopAction = useAsyncAction({
    fallbackError: 'Couldn’t stop the run. Try again.',
    onError: (message) => toast.error(message)
  });
  const stopping = stopAction.isPending;
  const canStop = Boolean(onStop && isActiveAgentRun(run));
  const canRetry = canRetryAgentRunFromZero(run);
  const canRerun = canRerunIssueAgent(run);
  const canOpenChat = run.surface === 'chat' && run.discussionId;
  if (!(providerError || canOpenChat || canStop || canRetry || canRerun)) return null;
  return (
    <Timeline.CardActions className="min-w-0 flex-wrap border-t bg-muted/25 py-2">
      {providerError ? (
        <Button asChild size="sm" variant="outline">
          <Link params={{ section: 'ai' }} to="/settings/$section">
            <Settings2 aria-hidden />
            AI settings
          </Link>
        </Button>
      ) : null}
      {run.surface === 'chat' && run.discussionId ? (
        <Button asChild size="sm" variant="outline">
          <Link {...chatHref({ discussionId: run.discussionId, tripId: run.tripId })}>
            Open chat
          </Link>
        </Button>
      ) : null}
      {onStop && isActiveAgentRun(run) ? (
        <Button
          data-testid={testIds.agentStop}
          onClick={() => void stopAction.run(async () => onStop(run.id))}
          pending={stopping}
          size="sm"
          variant="outline"
        >
          <Square aria-hidden />
          Stop
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
    </Timeline.CardActions>
  );
}
