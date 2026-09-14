import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { type ColumnDef, DataTable, type FilterFn } from '@groam/ui/components/data-table';
import { dataTableColumnFillClassName } from '@groam/ui/lib/data-table';
import { useMemo } from 'react';
import { cancelInvitationKey } from '@/features/group/group-shell/group-action-keys';
import type { ActiveOrganization } from '@/features/workspace/workspace-shell/workspace-state';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type Invitation = ActiveOrganization['invitations'][number];

const invitationFilter: FilterFn<Invitation> = (row, _columnId, value) => {
  const query = String(value).trim().toLowerCase();
  if (!query) return true;
  const invitation = row.original;
  return `${invitation.email} ${invitation.role} ${invitation.status}`
    .toLowerCase()
    .includes(query);
};

function invitationColumns({
  canManage,
  onCancel,
  pendingAction
}: {
  canManage: boolean;
  onCancel: (invitationId: string) => void;
  pendingAction: string | null;
}): ColumnDef<Invitation, unknown>[] {
  return [
    {
      accessorKey: 'email',
      cell: ({ row }) => {
        const invitation = row.original;
        return (
          <span className="block min-w-0">
            <span className="block truncate font-medium">{invitation.email}</span>
            <span className="mt-0.5 block truncate text-xs capitalize text-muted-foreground">
              {invitation.role}
            </span>
          </span>
        );
      },
      enableHiding: false,
      header: 'Invite',
      id: 'email',
      meta: { className: `w-[48%] ${dataTableColumnFillClassName} whitespace-normal` }
    },
    {
      accessorKey: 'status',
      cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
      header: 'Status',
      id: 'status',
      meta: { className: 'w-32' }
    },
    {
      cell: ({ row }) => {
        const invitation = row.original;
        if (!(canManage && invitation.status === 'pending')) return null;
        return (
          <Button
            disabled={pendingAction === cancelInvitationKey(invitation.id)}
            onClick={() => onCancel(invitation.id)}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
        );
      },
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      id: 'actions',
      meta: { className: 'w-28 text-right' }
    }
  ];
}

export function InvitationsSection({
  canManage,
  onCancel,
  organization,
  pendingAction
}: {
  canManage: boolean;
  onCancel: (invitationId: string) => void;
  organization: ActiveOrganization;
  pendingAction: string | null;
}) {
  const columns = useMemo(
    () => invitationColumns({ canManage, onCancel, pendingAction }),
    [canManage, onCancel, pendingAction]
  );

  if (organization.invitations.length === 0) return null;

  return (
    <DataTable
      columns={columns}
      data={organization.invitations}
      getRowId={(invitation) => invitation.id}
      globalFilterFn={invitationFilter}
      resourceLabel={{ plural: 'invitations', singular: 'invitation' }}
    />
  );
}
