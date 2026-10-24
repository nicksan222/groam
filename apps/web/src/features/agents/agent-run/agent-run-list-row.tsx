import { presentAgentRunMessage } from '@groam/ai/backend/runs/copy';
import { canRetryAgentRunFromZero } from '@groam/ai/backend/runs/roster';
import { agentRunTime } from '@groam/ai/backend/runs/time';
import { AgentRetryFromZeroButton } from '@groam/ai/ui/runs/agent-retry-from-zero';
import { Bot, Clock3, UserRound } from '@groam/icons';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { Badge } from '@groam/ui/components/badge';
import { List } from '@groam/ui/components/list';
import { initials } from '@groam/ui/lib/avatar';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { AgentRun } from '@/types/agents';
import { agentRunHref } from './agent-run-href';
import { AgentRunStatusBadge } from './agent-run-status-badge';

/**
 * One run: the title as the link over the trip and latest update; the status (and a retry when the
 * run can restart) on the right, then, on wide screens, when it last moved, the agent and who
 * started it, with the starter's avatar at the edge.
 */
export function AgentRunListRow({
  agentLabel,
  onRetry,
  run
}: {
  agentLabel: string;
  onRetry: () => Promise<unknown> | unknown;
  run: AgentRun;
}) {
  const detail = run.status === 'failed' && run.error ? presentAgentRunMessage(run) : run.headline;
  return (
    <List.Row data-testid={testIds.agentCard}>
      <List.Main>
        <List.Title asChild>
          <Link
            data-testid={testIds.agentRunFeedRunCell}
            title={run.title}
            {...agentRunHref(run.agentId, run.id)}
          >
            {run.title}
          </Link>
        </List.Title>
        <List.Aside>
          <span className="flex h-5 items-center justify-end gap-1">
            <AgentRunStatusBadge status={run.status} />
            {canRetryAgentRunFromZero(run) ? (
              <AgentRetryFromZeroButton onRetry={onRetry} testId={testIds.agentRetryFromZero} />
            ) : null}
          </span>
        </List.Aside>
        <List.Description>
          {run.related.tripName ? (
            <>
              <span title={run.related.tripName}>{run.related.tripName}</span>
              {' · '}
            </>
          ) : null}
          {detail ?? 'No update yet'}
        </List.Description>
      </List.Main>
      <List.Meta>
        <Badge className="tabular-nums" variant="outline">
          <Clock3 aria-hidden />
          <time
            dateTime={new Date(run.updatedAt).toISOString()}
            title={new Date(run.updatedAt).toLocaleString()}
          >
            {agentRunTime(run.updatedAt)}
          </time>
        </Badge>
        <Badge variant="outline">
          <Bot aria-hidden />
          {agentLabel}
        </Badge>
        <Badge variant="outline">
          <UserRound aria-hidden />
          <span>by {run.createdBy.name}</span>
        </Badge>
      </List.Meta>
      <List.Avatar>
        <Avatar
          aria-label={`Started by ${run.createdBy.name}`}
          className="size-5"
          role="img"
          title={`Started by ${run.createdBy.name}`}
        >
          <AvatarFallback className="text-[9px]">{initials(run.createdBy.name)}</AvatarFallback>
        </Avatar>
      </List.Avatar>
    </List.Row>
  );
}
