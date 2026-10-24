import { assistantAgents, isAssistantAgentId } from '@groam/ai/agents';
import { RUN_STATUS_LABEL } from '@groam/ai/backend/runs/ids';
import { Search } from '@groam/icons';
import { DataTable } from '@groam/ui/components/data-table';
import { List } from '@groam/ui/components/list';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useMemo, useState } from 'react';
import { useAgentRunControls } from '@/features/agents/hooks/use-agent-run';
import { ListStatusFilterSelect } from '@/features/workspace/workspace-list/list-status-filter-select';
import { useNavigate } from '@/lib/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { AgentRun, AgentRunStatusFilter } from '@/types/agents';
import { agentRunDatabaseColumns } from './agent-run-database-columns';
import { agentRunHref } from './agent-run-href';
import { AgentRunListRow } from './agent-run-list-row';

const statusLabels = { all: 'All statuses', ...RUN_STATUS_LABEL };
const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
  label,
  value: value as AgentRunStatusFilter
}));

function agentLabel(agentId: AgentRun['agentId']) {
  return isAssistantAgentId(agentId) ? assistantAgents[agentId].label : agentId;
}

export function AgentRunList({
  database = false,
  isLoading = false,
  runs
}: {
  database?: boolean;
  isLoading?: boolean;
  runs: AgentRun[];
}) {
  const { retry } = useAgentRunControls();
  const navigate = useNavigate();
  const columns = useMemo(() => agentRunDatabaseColumns((runId) => retry({ runId })), [retry]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<AgentRunStatusFilter>('all');
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

  const statusFilter = (
    <ListStatusFilterSelect
      ariaLabel="Filter runs by status"
      hasValue={status !== 'all'}
      labels={statusLabels}
      onChange={setStatus}
      options={statusOptions}
      value={status}
    />
  );

  if (database)
    return (
      <div data-testid={testIds.agentsRoster}>
        <DataTable
          columns={columns}
          data={visible}
          empty="No runs match your filters."
          externalFilter
          filterTestId={testIds.agentsRunsFilter}
          filterValue={query}
          getRowId={(run) => run.id}
          hasExtraFilters={status !== 'all'}
          onClear={() => setStatus('all')}
          onFilterValueChange={setQuery}
          onRowActivate={(run) => {
            void navigate(agentRunHref(run.agentId, run.id));
          }}
          resourceLabel={{ plural: 'runs', singular: 'run' }}
          rowTestId={testIds.agentCard}
          toolbarExtra={statusFilter}
        />
      </div>
    );

  return (
    <div data-testid={testIds.agentsRoster}>
      <List>
        <List.Toolbar
          active={status !== 'all'}
          noun={{ plural: 'runs', singular: 'run' }}
          onClear={() => setStatus('all')}
          onQueryChange={setQuery}
          query={query}
          testId={testIds.agentsRunsFilter}
        >
          {statusFilter}
        </List.Toolbar>
        <List.Body>
          {visible.length > 0 ? (
            <List.Group aria-label="Runs">
              {visible.map((run) => (
                <AgentRunListRow
                  agentLabel={agentLabel(run.agentId)}
                  key={run.id}
                  onRetry={() => retry({ runId: run.id })}
                  run={run}
                />
              ))}
            </List.Group>
          ) : (
            <List.Empty headline="No runs match your filters." icon={Search} />
          )}
        </List.Body>
      </List>
    </div>
  );
}
