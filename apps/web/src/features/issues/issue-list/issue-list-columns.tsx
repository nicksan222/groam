import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import type { ColumnDef } from '@groam/ui/components/data-table';
import {
  dataTableColumnFillClassName,
  dataTableMetaTimeClassName,
  dataTableSortHeaderClassName
} from '@groam/ui/lib/data-table';
import { ArrowUpDown, Sparkles } from 'lucide-react';
import type { IssueListItem } from '@/features/issues/hooks/issue-list-item';
import { relativeIssueDate } from '@/features/issues/hooks/issue-relative-date';
import { Link } from '@/features/workspace/navigation/router';
import { IssueAssignee } from './issue-assignee';

const personClass = `hidden md:table-cell md:w-[13%] ${dataTableColumnFillClassName}`;

export function issueColumns({
  showTripName
}: {
  showTripName: boolean;
}): ColumnDef<IssueListItem, unknown>[] {
  const columns: ColumnDef<IssueListItem, unknown>[] = [
    {
      accessorKey: 'title',
      cell: ({ row }) => {
        const issue = row.original;
        const subtitle = issue.idea ? `Idea · ${issue.idea.title}` : 'No linked idea';
        return (
          <span className="block min-w-0">
            <Link
              className="block break-words whitespace-normal font-medium hover:underline md:truncate"
              params={{ issueId: issue.id }}
              title={issue.title}
              to="/issues/$issueId"
            >
              {issue.title}
            </Link>
            {showTripName ? (
              <span className="mt-1 block truncate text-xs text-muted-foreground md:hidden">
                {issue.tripName}
              </span>
            ) : null}
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              {issue.idea ? <Sparkles aria-hidden className="size-3 shrink-0" /> : null}
              <span className="truncate">{subtitle}</span>
            </span>
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
          Issue
          <ArrowUpDown />
        </Button>
      ),
      id: 'title',
      meta: {
        className: `${showTripName ? 'md:w-[34%]' : 'md:w-[48%]'} ${dataTableColumnFillClassName} whitespace-normal`,
        label: 'Issue'
      }
    }
  ];

  if (showTripName) {
    columns.push({
      accessorKey: 'tripName',
      cell: ({ getValue }) => (
        <span
          className="block min-w-0 truncate text-muted-foreground"
          title={String(getValue() ?? '')}
        >
          {String(getValue() ?? '')}
        </span>
      ),
      header: 'Trip',
      id: 'trip',
      enableHiding: false,
      meta: { className: `hidden md:table-cell md:w-[22%] ${dataTableColumnFillClassName}` }
    });
  }

  columns.push(
    {
      accessorFn: (issue) => issue.author.name,
      cell: ({ getValue }) => (
        <span className="block min-w-0 truncate text-muted-foreground">{String(getValue())}</span>
      ),
      header: 'Opened by',
      id: 'author',
      enableHiding: false,
      meta: { className: personClass }
    },
    {
      accessorFn: (issue) => issue.assignee?.name ?? '',
      cell: ({ row }) => <IssueAssignee assignee={row.original.assignee} />,
      header: 'Assignee',
      id: 'assignee',
      enableHiding: false,
      meta: { className: personClass }
    },
    {
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge
          className="capitalize"
          variant={row.original.status === 'open' ? 'outline' : 'secondary'}
        >
          {row.original.status}
        </Badge>
      ),
      header: 'Status',
      id: 'status',
      enableHiding: false,
      meta: { className: 'w-24' }
    },
    {
      accessorKey: 'updatedAt',
      cell: ({ row }) => (
        <time
          className={dataTableMetaTimeClassName}
          dateTime={new Date(row.original.updatedAt).toISOString()}
        >
          {relativeIssueDate(row.original.updatedAt)}
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
      enableHiding: false,
      meta: { className: 'hidden md:table-cell w-28', label: 'Updated' }
    }
  );

  return columns;
}
