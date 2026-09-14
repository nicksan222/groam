import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import type { ColumnDef } from '@groam/ui/components/data-table';
import {
  dataTableColumnFillClassName,
  dataTableMetaTimeClassName,
  dataTableSortHeaderClassName
} from '@groam/ui/lib/data-table';
import { ArrowUpDown } from 'lucide-react';
import type { WorkspaceIdea } from '@/features/ideas/hooks/use-workspace-ideas';
import {
  isViewerDraft,
  pendingIdeaContinueLabel
} from '@/features/ideas/hooks/viewer-pending-idea';
import { ideaOpen } from '@/features/ideas/idea-glossary';
import { ideaOpenHref } from '@/features/ideas/idea-href';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { IdeaStatusBadge } from './idea-status-badge';

const ideaDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
export function ideaColumns({
  onOpen,
  showTripName,
  viewerUserId
}: {
  onOpen: (proposal: WorkspaceIdea) => void;
  showTripName: boolean;
  viewerUserId?: string | null;
}): ColumnDef<WorkspaceIdea, unknown>[] {
  return [
    {
      accessorKey: 'title',
      cell: ({ row }) => {
        const proposal = row.original;
        return (
          <span className="block min-w-0">
            <h4
              className="break-words whitespace-normal text-sm font-medium md:truncate"
              title={proposal.title}
            >
              {proposal.title}
            </h4>
            <span
              className={`mt-0.5 block truncate text-xs text-muted-foreground ${showTripName ? 'md:hidden' : ''}`}
            >
              {proposal.sourceTripName}
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
          Idea
          <ArrowUpDown />
        </Button>
      ),
      id: 'title',
      meta: {
        className: `${showTripName ? 'md:w-[32%]' : 'md:w-[48%]'} ${dataTableColumnFillClassName} whitespace-normal`,
        label: 'Idea'
      }
    },
    {
      accessorFn: (proposal) => proposal.status,
      cell: ({ row }) => {
        const proposal = row.original;
        return isViewerDraft(proposal, viewerUserId) ? (
          <Badge>Your draft</Badge>
        ) : (
          <IdeaStatusBadge status={proposal.status} />
        );
      },
      header: 'Status',
      id: 'status',
      enableHiding: false,
      meta: { className: 'w-28' }
    },
    ...(showTripName
      ? [
          {
            accessorKey: 'sourceTripName',
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
            meta: { className: `hidden md:table-cell md:w-[20%] ${dataTableColumnFillClassName}` }
          } satisfies ColumnDef<WorkspaceIdea, unknown>
        ]
      : []),
    {
      accessorFn: (proposal) => proposal.author.name,
      cell: ({ getValue }) => (
        <span className="block min-w-0 truncate text-muted-foreground">{String(getValue())}</span>
      ),
      header: 'Started by',
      id: 'author',
      enableHiding: false,
      meta: { className: `hidden md:table-cell md:w-[14%] ${dataTableColumnFillClassName}` }
    },
    {
      accessorKey: 'updatedAt',
      cell: ({ row }) => (
        <time
          className={dataTableMetaTimeClassName}
          dateTime={new Date(row.original.updatedAt).toISOString()}
        >
          {ideaDateFormatter.format(row.original.updatedAt)}
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
    },
    {
      cell: ({ row }) => {
        const proposal = row.original;
        const draft = isViewerDraft(proposal, viewerUserId);
        const href = ideaOpenHref(proposal, viewerUserId);
        if (draft) {
          return (
            <Button
              className="w-[9.25rem]"
              data-testid={testIds.ideaContinue}
              onClick={() => onOpen(proposal)}
              size="sm"
            >
              {pendingIdeaContinueLabel('draft')}
            </Button>
          );
        }
        return (
          <Button
            asChild
            className="w-[9.25rem]"
            data-testid={testIds.ideaView}
            size="sm"
            variant="outline"
          >
            <Link params={href.params} search={'search' in href ? href.search : {}} to={href.to}>
              {ideaOpen}
            </Link>
          </Button>
        );
      },
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      id: 'actions',
      meta: { className: 'hidden md:table-cell w-40 text-right' }
    }
  ];
}
