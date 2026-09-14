import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import type { ColumnDef } from '@groam/ui/components/data-table';
import {
  dataTableColumnFillClassName,
  dataTableMetaTimeClassName,
  dataTableSortHeaderClassName
} from '@groam/ui/lib/data-table';
import { ArrowUpDown } from 'lucide-react';
import {
  activityTypeLabels,
  type TripActivityItem
} from '@/features/trips/hooks/trip-activity-history-filter';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

export function tripActivityColumns(): ColumnDef<TripActivityItem, unknown>[] {
  return [
    {
      accessorKey: 'message',
      cell: ({ row }) => (
        <span className="block min-w-0 truncate font-medium" title={row.original.message}>
          {row.original.message}
        </span>
      ),
      enableHiding: false,
      header: ({ column }) => (
        <Button
          className={dataTableSortHeaderClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          size="sm"
          variant="ghost"
        >
          Event
          <ArrowUpDown />
        </Button>
      ),
      id: 'message',
      meta: { className: `w-[42%] ${dataTableColumnFillClassName}`, label: 'Event' }
    },
    {
      accessorKey: 'actorName',
      cell: ({ getValue }) => (
        <span className="block min-w-0 truncate text-muted-foreground">{String(getValue())}</span>
      ),
      header: 'Person',
      id: 'actor',
      meta: { className: `w-[18%] ${dataTableColumnFillClassName}` }
    },
    {
      accessorFn: (item) => activityTypeLabels[item.type],
      cell: ({ row }) => (
        <Badge className="max-w-full truncate" variant="outline">
          {activityTypeLabels[row.original.type]}
        </Badge>
      ),
      header: 'Action',
      id: 'type',
      meta: { className: `w-[22%] ${dataTableColumnFillClassName}` }
    },
    {
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <time
          className={dataTableMetaTimeClassName}
          dateTime={new Date(row.original.createdAt).toISOString()}
        >
          {dateTimeFormatter.format(row.original.createdAt)}
        </time>
      ),
      header: ({ column }) => (
        <Button
          className={dataTableSortHeaderClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          size="sm"
          variant="ghost"
        >
          When
          <ArrowUpDown />
        </Button>
      ),
      id: 'createdAt',
      meta: { className: 'w-36', label: 'When' }
    }
  ];
}
