import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { type ColumnDef, DataTable, type FilterFn } from '@groam/ui/components/data-table';
import { dataTableColumnFillClassName } from '@groam/ui/lib/data-table';
import { Copy } from 'lucide-react';
import { useMemo } from 'react';
import type { InvitationCode } from '@/types/invitation-codes';

const invitationFilter: FilterFn<InvitationCode> = (row, _columnId, value) => {
  const query = String(value).trim().toLowerCase();
  if (!query) return true;
  return `${row.original.code} ${row.original.role}`.toLowerCase().includes(query);
};

function invitationColumns({
  onCopy,
  onRevoke,
  pendingId
}: {
  onCopy: (code: string) => void;
  onRevoke: (invitationCodeId: InvitationCode['id']) => void;
  pendingId: InvitationCode['id'] | null;
}): ColumnDef<InvitationCode, unknown>[] {
  return [
    {
      accessorKey: 'code',
      cell: ({ row }) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="font-mono font-medium tracking-wide">{row.original.code}</span>
          <Button
            aria-label={`Copy ${row.original.code}`}
            onClick={() => onCopy(row.original.code)}
            size="icon-sm"
            variant="ghost"
          >
            <Copy />
          </Button>
        </span>
      ),
      enableHiding: false,
      header: 'Code',
      id: 'code',
      meta: { className: `w-[50%] ${dataTableColumnFillClassName} whitespace-normal` }
    },
    {
      accessorKey: 'role',
      cell: ({ row }) => <Badge variant="secondary">{row.original.role}</Badge>,
      header: 'Role',
      id: 'role',
      meta: { className: 'w-28 capitalize' }
    },
    {
      accessorKey: 'expiresAt',
      cell: ({ row }) => new Date(row.original.expiresAt).toLocaleDateString(),
      header: 'Expires',
      id: 'expiresAt',
      meta: { className: 'w-32' }
    },
    {
      cell: ({ row }) => (
        <Button
          disabled={pendingId === row.original.id}
          onClick={() => onRevoke(row.original.id)}
          size="sm"
          variant="ghost"
        >
          Revoke
        </Button>
      ),
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      id: 'actions',
      meta: { className: 'w-28 text-right' }
    }
  ];
}

export function InvitationsSection({
  codes,
  onCopy,
  onRevoke,
  pendingId
}: {
  codes: InvitationCode[];
  onCopy: (code: string) => void;
  onRevoke: (invitationCodeId: InvitationCode['id']) => void;
  pendingId: InvitationCode['id'] | null;
}) {
  const columns = useMemo(
    () => invitationColumns({ onCopy, onRevoke, pendingId }),
    [onCopy, onRevoke, pendingId]
  );

  if (codes.length === 0) return null;
  return (
    <DataTable
      columns={columns}
      data={codes}
      getRowId={(invitation) => invitation.id}
      globalFilterFn={invitationFilter}
      resourceLabel={{ plural: 'invitation codes', singular: 'invitation code' }}
    />
  );
}
