import { assistantAgents, isAssistantAgentId } from '@groam/ai/agents';
import { RUN_STATUS_LABEL } from '@groam/ai/backend/runs/ids';
import { PageLoading } from '@groam/ui/components/page-loading';
import { RecordList } from '@groam/ui/components/record-list';
import { useMemo, useState } from 'react';
import { useAgentRunControls } from '@/features/agents/hooks/use-agent-run';
import { ListStatusFilterSelect } from '@/features/workspace/workspace-list/list-status-filter-select';
import { recordListSorts } from '@/features/workspace/workspace-list/record-list-sorts';
import { testIds } from '@/lib/test-ids';
import type { AgentRunListRun, AgentRunStatusFilter } from '@/types/agents';
import { AgentRunListRow } from './agent-run-list-row';

const statusLabels = { all: 'All statuses', ...RUN_STATUS_LABEL };
const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
  label,
  value: value as AgentRunStatusFilter
}));

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
  const [status, setStatus] = useState<AgentRunStatusFilter>('all');
  const sortOptions = useMemo(() => recordListSorts<AgentRunListRun>(), []);
  const needle = query.trim().toLowerCase();
  const visible = runs.filter(
    (run) =>
      (status === 'all' || run.status === status) &&
      [
        run.title,
        agentLabel(run.agentId),
        run.createdBy.name,
        run.headline,
        run.error,
        run.related.tripName
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle)
  );

  if (isLoading) return <PageLoading label="Loading agent runs…" />;

  return (
    <div data-testid={testIds.agentsRoster}>
      <RecordList
        empty="No runs match your filters."
        filterTestId={testIds.agentsRunsFilter}
        getKey={(run) => run.id}
        items={visible}
        hasExtraFilters={status !== 'all'}
        onClear={() => setStatus('all')}
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
        toolbarExtra={
          <ListStatusFilterSelect
            ariaLabel="Filter runs by status"
            hasValue={status !== 'all'}
            labels={statusLabels}
            onChange={setStatus}
            options={statusOptions}
            value={status}
          />
        }
      />
    </div>
  );
}
