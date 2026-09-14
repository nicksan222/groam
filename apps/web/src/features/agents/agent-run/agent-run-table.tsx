import { assistantAgents, isAssistantAgentId } from '@groam/ai-contracts/agents/registry';
import { canRetryAgentRunFromZero } from '@groam/ai-contracts/agents/runs/roster';
import { agentRunTime } from '@groam/ai-contracts/agents/runs/time';
import { AgentRetryFromZeroButton } from '@groam/ui/ai/runs/agent-retry-from-zero';
import { Button } from '@groam/ui/components/button';
import { type ColumnDef, DataTable, type FilterFn } from '@groam/ui/components/data-table';
import { PageLoading } from '@groam/ui/components/page-loading';
import {
  dataTableColumnFillClassName,
  dataTableMetaTimeClassName,
  dataTableSortHeaderClassName
} from '@groam/ui/lib/data-table';
import { useNavigate } from '@tanstack/react-router';
import { ArrowUpDown } from 'lucide-react';
import { useMemo } from 'react';
import { useAgentRunControls } from '@/features/agents/hooks/use-agent-run';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { AgentRunTableRun } from '@/types/agents';
import { agentRunHref } from './agent-run-href';
import { AgentRunStatusBadge } from './agent-run-status-badge';

function agentLabel(agentId: AgentRunTableRun['agentId']) {
  return isAssistantAgentId(agentId) ? assistantAgents[agentId].label : agentId;
}

const runFilter: FilterFn<AgentRunTableRun> = (row, _columnId, value) => {
  const run = row.original;
  const query = String(value).trim().toLowerCase();
  if (!query) return true;
  const haystack = [run.title, agentLabel(run.agentId), run.createdBy.name, run.headline, run.error]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
};

function agentRunColumns(
  onRetry: (runId: AgentRunTableRun['id']) => void
): ColumnDef<AgentRunTableRun, unknown>[] {
  return [
    {
      accessorKey: 'title',
      cell: ({ row }) => {
        const run = row.original;
        const detail = run.status === 'failed' ? run.error : run.headline;
        return (
          <span className="block min-w-0 max-w-sm" data-testid={testIds.agentRunFeedRunCell}>
            <Link
              className="block min-w-0 truncate font-semibold hover:underline"
              {...agentRunHref(run.agentId, run.id)}
            >
              {run.title}
            </Link>
            {detail ? (
              <span className="mt-0.5 block min-w-0 truncate text-xs text-muted-foreground">
                {detail}
              </span>
            ) : null}
          </span>
        );
      },
      enableHiding: false,
      header: ({ column }) => (
        <Button
          className={dataTableSortHeaderClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          size="sm"
          variant="ghost"
        >
          Run
          <ArrowUpDown />
        </Button>
      ),
      id: 'title',
      meta: { className: `w-[32%] ${dataTableColumnFillClassName}`, label: 'Run' }
    },
    {
      accessorFn: (run) => agentLabel(run.agentId),
      cell: ({ getValue }) => <span className="text-muted-foreground">{String(getValue())}</span>,
      header: 'Agent',
      id: 'agent',
      meta: { className: `w-[14%] ${dataTableColumnFillClassName}` }
    },
    {
      accessorFn: (run) => run.createdBy.name,
      cell: ({ getValue }) => <span className="text-muted-foreground">{String(getValue())}</span>,
      header: 'Called by',
      id: 'caller',
      meta: { className: `w-[14%] ${dataTableColumnFillClassName}` }
    },
    {
      accessorKey: 'status',
      cell: ({ row }) => <AgentRunStatusBadge status={row.original.status} />,
      header: 'Status',
      id: 'status',
      meta: { className: 'w-28' }
    },
    {
      accessorKey: 'updatedAt',
      cell: ({ row }) => (
        <time
          className={dataTableMetaTimeClassName}
          dateTime={new Date(row.original.updatedAt).toISOString()}
        >
          {agentRunTime(row.original.updatedAt)}
        </time>
      ),
      header: ({ column }) => (
        <Button
          className={dataTableSortHeaderClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          size="sm"
          variant="ghost"
        >
          Updated
          <ArrowUpDown />
        </Button>
      ),
      id: 'updatedAt',
      meta: { className: 'w-28', label: 'Updated' }
    },
    {
      cell: ({ row }) => {
        const run = row.original;
        if (!canRetryAgentRunFromZero(run)) return null;
        return (
          <div className="flex justify-end">
            <AgentRetryFromZeroButton
              onRetry={() => onRetry(run.id)}
              testId={testIds.agentRetryFromZero}
            />
          </div>
        );
      },
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      id: 'actions',
      meta: { className: 'w-36 text-right' }
    }
  ];
}

export function AgentRunTable({
  isLoading = false,
  runs
}: {
  isLoading?: boolean;
  runs: AgentRunTableRun[];
}) {
  const navigate = useNavigate();
  const { retry } = useAgentRunControls();
  const columns = useMemo(() => agentRunColumns((runId) => void retry({ runId })), [retry]);

  if (isLoading) {
    return <PageLoading label="Loading agent runs…" />;
  }

  return (
    <DataTable
      columns={columns}
      data={runs}
      filterPlaceholderPrefix="Filter"
      filterTestId={testIds.agentsRunsFilter}
      getRowId={(run) => run.id}
      globalFilterFn={runFilter}
      onRowActivate={(run) => void navigate(agentRunHref(run.agentId, run.id))}
      resourceLabel={{ plural: 'runs', singular: 'run' }}
      rowTestId={testIds.agentCard}
      testId={testIds.agentsRoster}
    />
  );
}
