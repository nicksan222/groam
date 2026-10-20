import { assistantAgents, isAssistantAgentId } from '@groam/ai/agents';
import { PageLoading } from '@groam/ui/components/page-loading';
import { RecordList } from '@groam/ui/components/record-list';
import { useMemo, useState } from 'react';
import { useAgentRunControls } from '@/features/agents/hooks/use-agent-run';
import { recordListSorts } from '@/features/workspace/workspace-list/record-list-sorts';
import { testIds } from '@/lib/test-ids';
import type { AgentRunListRun } from '@/types/agents';
import { AgentRunListRow } from './agent-run-list-row';

function agentLabel(agentId: AgentRunListRun['agentId']) {
  return isAssistantAgentId(agentId) ? assistantAgents[agentId].label : agentId;
}

export function AgentRunList({
  isLoading = false,
  runs
}: {
  isLoading?: boolean;
  runs: AgentRunListRun[];
}) {
  const { retry } = useAgentRunControls();
  const [query, setQuery] = useState('');
  const sortOptions = useMemo(() => recordListSorts<AgentRunListRun>(), []);
  const needle = query.trim().toLowerCase();
  const visible = runs.filter((run) =>
    [run.title, agentLabel(run.agentId), run.createdBy.name, run.headline, run.error]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(needle)
  );

  if (isLoading) return <PageLoading label="Loading agent runs…" />;

  return (
    <div data-testid={testIds.agentsRoster}>
      <RecordList
        empty="No runs match your search."
        filterTestId={testIds.agentsRunsFilter}
        getKey={(run) => run.id}
        items={visible}
        onQueryChange={setQuery}
        query={query}
        renderItem={(run) => (
          <AgentRunListRow
            agentLabel={agentLabel(run.agentId)}
            onRetry={() => retry({ runId: run.id })}
            run={run}
          />
        )}
        resourceLabel={{ plural: 'runs', singular: 'run' }}
        sortOptions={sortOptions}
      />
    </div>
  );
}
