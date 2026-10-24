import { Badge } from '@groam/ui/components/badge';
import PulsingDot from '@groam/ui/components/pulsing-dot';
import Shell from '@groam/ui/components/shell/client';
import { SHELL_HEADER_FACT } from '@groam/ui/lib/shell-layout';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { AgentDetailAgent } from '@/types/agents';
import { AgentStatusBadge } from './agent-status-badge';

export type { AgentDetailAgent };

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type AgentDetailHeaderLoadedProps = {
  agent: AgentDetailAgent;
  isLoading?: false;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type AgentDetailHeaderLoadingProps = {
  agent?: undefined;
  isLoading: true;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type AgentDetailHeaderProps = AgentDetailHeaderLoadedProps | AgentDetailHeaderLoadingProps;

/** An agent's page header: Home, then the agent's name and status, with what it is for. */
export function AgentDetailHeader(props: AgentDetailHeaderProps) {
  if (props.isLoading) return null;
  const { agent } = props;
  return (
    <Shell.Header
      meta={
        <>
          <span className={SHELL_HEADER_FACT}>
            <span className="min-w-0 truncate">{agent.description}</span>
          </span>
          <span className={SHELL_HEADER_FACT}>
            <Badge variant="outline">{agent.surface === 'chat' ? 'Chat' : 'Worker'}</Badge>
          </span>
        </>
      }
      parent={<Link to="/">Home</Link>}
      status={
        <>
          {agent.status === 'working' ? <PulsingDot color="primary" /> : null}
          <AgentStatusBadge status={agent.status} />
        </>
      }
      title={agent.label}
      titleProps={{ 'data-testid': testIds.agentDetailTitle }}
    />
  );
}
