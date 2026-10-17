import { assistantAgents } from '@groam/ai/agents';
import { agentRunCopy } from '@groam/ai/backend/runs/copy';
import { AgentRunBanner } from '@groam/ai/ui/runs/agent-run-banner';
import type { Id } from '@groam/backend/data-model';
import { agentRunHref } from '@/features/agents/agent-run/agent-run-href';
import { useAgentRunControls } from '@/features/agents/hooks/use-agent-run';
import { useCancelWait, useDiscussionWaits } from '@/features/agents/hooks/use-agent-waits';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

/** Runs in this chat that are waiting on the group; new messages are answered normally meanwhile. */
export function DiscussionWaitBanner({ discussionId }: { discussionId: Id<'discussions'> }) {
  const waits = useDiscussionWaits(discussionId);
  const cancelWait = useCancelWait();
  const { stop } = useAgentRunControls();
  if (waits.length === 0) return null;
  return (
    <div
      className="flex shrink-0 flex-col gap-2 border-b border-border/70 p-3"
      data-testid={testIds.discussionWaitBanner}
    >
      {waits.map((wait) => (
        <AgentRunBanner
          agentLabel={assistantAgents[wait.agentId].label}
          cancelWaitTestId={testIds.agentWaitCancel}
          events={[]}
          key={wait.id}
          onCancelWait={() => cancelWait(wait.id)}
          onStop={() => stop({ runId: wait.runId })}
          run={{
            headline: `${agentRunCopy.waitingFor} ${wait.label}`,
            id: wait.runId,
            status: 'waiting'
          }}
          stopTestId={testIds.agentStop}
          viewAgent={
            <Link {...agentRunHref(wait.agentId, wait.runId)}>{agentRunCopy.viewAgent}</Link>
          }
          wait={wait}
        />
      ))}
    </div>
  );
}
