import { Button } from '@groam/ui/components/button';
import type { ColumnDef } from '@groam/ui/components/data-table';
import {
  dataTableColumnFillClassName,
  dataTableMetaTimeClassName,
  dataTableSortHeaderClassName
} from '@groam/ui/lib/data-table';
import { ArrowUpDown } from 'lucide-react';
import { relativeIssueDate } from '@/features/issues/hooks/issue-relative-date';
import { testIds } from '@/lib/test-ids';
import type { ResearchSummary } from '@/types/research';

export function researchColumns(): ColumnDef<ResearchSummary, unknown>[] {
  return [
    {
      accessorKey: 'title',
      cell: ({ row }) => {
        const research = row.original;
        return (
          <span className="block min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              {research.unread ? (
                <span
                  aria-label="Unread messages"
                  className="size-2 shrink-0 rounded-full bg-primary"
                  data-testid={testIds.researchUnread}
                  role="img"
                />
              ) : null}
              <span
                className="block min-w-0 break-words whitespace-normal font-medium md:truncate"
                title={research.title}
              >
                {research.title}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {research.brief ?? 'No brief'}
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
          Research
          <ArrowUpDown />
        </Button>
      ),
      id: 'title',
      meta: {
        className: `md:w-[38%] ${dataTableColumnFillClassName} whitespace-normal`,
        label: 'Research'
      }
    },
    {
      accessorFn: (research) => research.lastMessage?.text ?? '',
      cell: ({ row }) => {
        const message = row.original.lastMessage;
        if (!message) return <span className="text-muted-foreground">No messages yet</span>;
        return (
          <span className="block min-w-0 truncate text-muted-foreground" title={message.text}>
            <span className="font-medium text-foreground">{message.authorName}: </span>
            {message.text}
          </span>
        );
      },
      enableHiding: false,
      header: 'Latest',
      id: 'latest',
      meta: { className: `hidden md:table-cell ${dataTableColumnFillClassName}` }
    },
    {
      accessorKey: 'participantCount',
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{row.original.participantCount}</span>
      ),
      enableHiding: false,
      header: 'People',
      id: 'people',
      meta: { className: 'hidden md:table-cell w-20' }
    },
    {
      accessorKey: 'linkCount',
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{row.original.linkCount}</span>
      ),
      enableHiding: false,
      header: 'Links',
      id: 'links',
      meta: { className: 'hidden md:table-cell w-20' }
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
      enableHiding: false,
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
    }
  ];
}
