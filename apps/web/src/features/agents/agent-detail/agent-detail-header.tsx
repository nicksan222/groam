import { Badge } from '@groam/ui/components/badge';
import { PageCrumbNav } from '@groam/ui/components/page-crumb-nav';
import PulsingDot from '@groam/ui/components/pulsing-dot';
import Shell from '@groam/ui/components/shell/client';
import { Skeleton } from '@groam/ui/components/skeleton';
import { Bot } from 'lucide-react';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { AgentDetailAgent } from '@/types/agents';
import { AgentStatusBadge } from './agent-status-badge';

export type { AgentDetailAgent };

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type AgentDetailHeaderLoadedProps = {
  agent: AgentDetailAgent;
  isLoading?: false;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type AgentDetailHeaderLoadingProps = {
  agent?: undefined;
  isLoading: true;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type AgentDetailHeaderProps = AgentDetailHeaderLoadedProps | AgentDetailHeaderLoadingProps;

export function AgentDetailHeader(props: AgentDetailHeaderProps) {
  return (
    <div
      aria-busy={props.isLoading ? true : undefined}
      className="flex min-w-0 flex-col gap-1.5"
      role={props.isLoading ? 'status' : undefined}
    >
      {props.isLoading ? <span className="sr-only">Loading agent…</span> : null}
      <PageCrumbNav
        inset={false}
        isLoading={props.isLoading}
        parent={{
          asChild: true,
          children: <Link to="/agents" />,
          label: 'All agents'
        }}
      />
      <Shell.Title data-testid={testIds.agentDetailTitle}>
        <span className="flex items-center gap-2">
          {props.isLoading ? (
            <>
              <Bot className="size-5 text-muted-foreground" />
              <Skeleton className="h-7 w-40" />
            </>
          ) : (
            <>
              {props.agent.status === 'working' ? (
                <PulsingDot color="primary" />
              ) : (
                <Bot className="size-5" />
              )}
              {props.agent.label}
            </>
          )}
        </span>
      </Shell.Title>
      {props.isLoading ? (
        <>
          <Shell.Description>
            <Skeleton className="h-4 w-full max-w-lg" />
          </Shell.Description>
          <span className="flex gap-1 pt-1">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </span>
        </>
      ) : (
        <>
          <Shell.Description>{props.agent.description}</Shell.Description>
          <span className="flex gap-1 pt-1">
            <Badge variant="outline">{props.agent.surface === 'chat' ? 'Chat' : 'Worker'}</Badge>
            <AgentStatusBadge status={props.agent.status} />
          </span>
        </>
      )}
    </div>
  );
}
