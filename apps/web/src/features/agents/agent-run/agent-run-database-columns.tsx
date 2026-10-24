import { assistantAgents, isAssistantAgentId } from '@groam/ai/agents';
import { canRetryAgentRunFromZero } from '@groam/ai/backend/runs/roster';
import { agentRunTime } from '@groam/ai/backend/runs/time';
import { AgentRetryFromZeroButton } from '@groam/ai/ui/runs/agent-retry-from-zero';
import type { ColumnDef } from '@groam/ui/components/data-table';
import { DataTableSortHeader } from '@groam/ui/components/data-table-sort-header';
import { dataTableColumnFillClassName } from '@groam/ui/lib/data-table';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { AgentRun } from '@/types/agents';
import { agentRunHref } from './agent-run-href';
import { AgentRunStatusBadge } from './agent-run-status-badge';

export function agentRunDatabaseColumns(
  onRetry: (runId: AgentRun['id']) => Promise<unknown> | unknown
): ColumnDef<AgentRun>[] {
  return [
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableSortHeader column={column} label="Activity" />,
      enableHiding: false,
      meta: { className: dataTableColumnFillClassName, label: 'Activity' },
      cell: ({ row }) => (
        <span className="block min-w-0" data-testid={testIds.agentRunFeedRunCell}>
          <Link
            className="block truncate font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={row.original.title}
            {...agentRunHref(row.original.agentId, row.original.id)}
          >
            {row.original.title}
          </Link>
        </span>
      )
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableSortHeader column={column} label="Status" />,
      enableHiding: false,
      meta: { className: 'w-28', label: 'Status' },
      cell: ({ row }) => <AgentRunStatusBadge status={row.original.status} />
    },
    {
      accessorFn: (run) =>
        isAssistantAgentId(run.agentId) ? assistantAgents[run.agentId].label : run.agentId,
      id: 'agent',
      header: ({ column }) => <DataTableSortHeader column={column} label="Agent" />,
      meta: { className: 'hidden w-40 md:table-cell', label: 'Agent' },
      cell: ({ row, getValue }) => (
        <span
          className="block truncate text-muted-foreground"
          title={row.original.related.tripName ?? String(getValue())}
        >
          {String(getValue())}
        </span>
      )
    },
    {
      accessorFn: (run) => run.createdBy.name,
      id: 'creator',
      header: ({ column }) => <DataTableSortHeader column={column} label="Started by" />,
      meta: { className: 'hidden w-28 lg:table-cell', label: 'Started by' },
      cell: ({ getValue }) => (
        <span className="block truncate text-muted-foreground" title={String(getValue())}>
          {String(getValue())}
        </span>
      )
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => (
        <>
          <span className="hidden sm:inline-flex">
            <DataTableSortHeader column={column} label="Updated" />
          </span>
          <span className="sr-only sm:hidden">Actions</span>
        </>
      ),
      meta: { className: 'w-12 sm:w-36', label: 'Updated' },
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center justify-end gap-2">
          <time
            className="hidden truncate text-xs text-muted-foreground sm:inline"
            dateTime={new Date(row.original.updatedAt).toISOString()}
            title={new Date(row.original.updatedAt).toLocaleString()}
          >
            {agentRunTime(row.original.updatedAt)}
          </time>
          {canRetryAgentRunFromZero(row.original) ? (
            <AgentRetryFromZeroButton
              onRetry={() => onRetry(row.original.id)}
              testId={testIds.agentRetryFromZero}
            />
          ) : null}
        </div>
      )
    }
  ];
}
