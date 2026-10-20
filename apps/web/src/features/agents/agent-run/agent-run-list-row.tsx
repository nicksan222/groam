import { presentAgentRunMessage } from '@groam/ai/backend/runs/copy';
import { canRetryAgentRunFromZero } from '@groam/ai/backend/runs/roster';
import { agentRunTime } from '@groam/ai/backend/runs/time';
import { AgentRetryFromZeroButton } from '@groam/ai/ui/runs/agent-retry-from-zero';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { RecordListItem } from '@groam/ui/components/record-list-item';
import { initials } from '@groam/ui/lib/avatar';
import { recordListWrappedTitleClassName } from '@groam/ui/lib/record-list';
import { Bot, Clock3, MapPin, MessageSquareText, UserRound } from 'lucide-react';
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
      wrapTitle
      badges={
        <>
          <RecordListBadge className="gap-1.5 tabular-nums">
            <Clock3 aria-hidden />
            <time
              dateTime={new Date(run.updatedAt).toISOString()}
              title={new Date(run.updatedAt).toLocaleString()}
            >
              {agentRunTime(run.updatedAt)}
            </time>
          </RecordListBadge>
          {canRetryAgentRunFromZero(run) ? (
            <AgentRetryFromZeroButton onRetry={onRetry} testId={testIds.agentRetryFromZero} />
          ) : null}
          <Avatar
            aria-label={`Started by ${run.createdBy.name}`}
            className="ml-2 hidden size-6 @md/record:flex"
            role="img"
            title={`Started by ${run.createdBy.name}`}
          >
            <AvatarFallback className="text-[9px]">{initials(run.createdBy.name)}</AvatarFallback>
          </Avatar>
        </>
      }
      description={
        <span className="flex h-6 min-w-0 items-center gap-1.5">
          {run.related.tripName ? (
            <RecordListBadge
              className="min-w-0 max-w-[50%] shrink gap-1.5"
              title={run.related.tripName}
            >
              <MapPin aria-hidden className="shrink-0" />
              <span className="truncate">{run.related.tripName}</span>
            </RecordListBadge>
          ) : null}
          <RecordListBadge className="min-w-0 shrink gap-1.5" title={detail ?? undefined}>
            <MessageSquareText aria-hidden className="shrink-0" />
            <span className="truncate">{detail ?? 'No update yet'}</span>
          </RecordListBadge>
        </span>
      }
      data-testid={testIds.agentCard}
      metadata={
        <>
          <AgentRunStatusBadge status={run.status} />
          <RecordListBadge className="gap-1.5">
            <Bot aria-hidden />
            {agentLabel}
          </RecordListBadge>
          <RecordListBadge className="hidden gap-1.5 @lg/record:inline-flex">
            <UserRound aria-hidden />
            <span>by {run.createdBy.name}</span>
          </RecordListBadge>
        </>
      }
      title={
        <span className="block min-w-0" data-testid={testIds.agentRunFeedRunCell}>
          <Link
            className={recordListWrappedTitleClassName}
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
