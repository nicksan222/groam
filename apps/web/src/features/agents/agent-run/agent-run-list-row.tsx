import { presentAgentRunMessage } from '@groam/ai/backend/runs/copy';
import { canRetryAgentRunFromZero } from '@groam/ai/backend/runs/roster';
import { agentRunTime } from '@groam/ai/backend/runs/time';
import { AgentRetryFromZeroButton } from '@groam/ai/ui/runs/agent-retry-from-zero';
import { RecordListItem } from '@groam/ui/components/record-list-item';
import { recordListTitleClassName } from '@groam/ui/lib/record-list';
import { Bot } from 'lucide-react';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { AgentRunListRun } from '@/types/agents';
import { agentRunHref } from './agent-run-href';
import { AgentRunStatusBadge } from './agent-run-status-badge';

export function AgentRunListRow({
  agentLabel,
  onRetry,
  run
}: {
  agentLabel: string;
  onRetry: () => Promise<unknown> | unknown;
  run: AgentRunListRun;
}) {
  const detail = run.status === 'failed' && run.error ? presentAgentRunMessage(run) : run.headline;
  return (
    <RecordListItem
      badges={
        <>
          <time
            className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
            dateTime={new Date(run.updatedAt).toISOString()}
          >
            {agentRunTime(run.updatedAt)}
          </time>
          {canRetryAgentRunFromZero(run) ? (
            <AgentRetryFromZeroButton onRetry={onRetry} testId={testIds.agentRetryFromZero} />
          ) : null}
        </>
      }
      description={
        <span className="block truncate" title={detail ?? undefined}>
          {detail ?? 'No update yet'}
        </span>
      }
      data-testid={testIds.agentCard}
      icon={<Bot aria-hidden className="text-muted-foreground" />}
      metadata={
        <>
          <AgentRunStatusBadge status={run.status} />
          <span className="shrink-0">{agentLabel}</span>
          <span className="sr-only sm:not-sr-only sm:shrink-0">by {run.createdBy.name}</span>
        </>
      }
      title={
        <span className="block min-w-0" data-testid={testIds.agentRunFeedRunCell}>
          <Link
            className={recordListTitleClassName}
            title={run.title}
            {...agentRunHref(run.agentId, run.id)}
          >
            {run.title}
          </Link>
        </span>
      }
    />
  );
}
