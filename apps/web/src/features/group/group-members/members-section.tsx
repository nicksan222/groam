import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { type ColumnDef, DataTable, type FilterFn } from '@groam/ui/components/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { initials } from '@groam/ui/lib/avatar';
import { dataTableColumnFillClassName } from '@groam/ui/lib/data-table';
import { useMemo } from 'react';
import type { ActiveOrganization } from '@/features/workspace/workspace-shell/workspace-state';
import { userIdentityLabel } from '@/lib/user-identity';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type Member = ActiveOrganization['members'][number];

const memberFilter: FilterFn<Member> = (row, _columnId, value) => {
  const query = String(value).trim().toLowerCase();
  if (!query) return true;
  const member = row.original;
  return `${member.user.name} ${userIdentityLabel(member.user)} ${member.role}`
    .toLowerCase()
    .includes(query);
};

function memberColumns({
  canManage,
  onLeave,
  onRemove,
  onRoleChange,
  pendingAction,
  viewerUserId
}: {
  canManage: boolean;
  onLeave: () => void;
  onRemove: (memberId: string) => void;
  onRoleChange: (memberId: string, role: string) => void;
  pendingAction: string | null;
  viewerUserId: string;
}): ColumnDef<Member, unknown>[] {
  return [
    {
      accessorFn: (member) => member.user.name,
      cell: ({ row }) => {
        const member = row.original;
        const isYou = member.userId === viewerUserId;
        return (
          <span className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9 shrink-0">
              <AvatarImage alt={member.user.name} src={member.user.image ?? ''} />
              <AvatarFallback>{initials(member.user.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {member.user.name}
                {isYou ? ' (you)' : ''}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {userIdentityLabel(member.user)}
              </span>
            </span>
          </span>
        );
      },
      enableHiding: false,
      header: 'Member',
      id: 'name',
      meta: { className: `w-[46%] ${dataTableColumnFillClassName} whitespace-normal` }
    },
    {
      accessorKey: 'role',
      cell: ({ row }) => {
        const member = row.original;
        const isYou = member.userId === viewerUserId;
        const isOwner = member.role === 'owner';
        if (canManage && !isOwner && !isYou) {
          return (
            <Select
              disabled={pendingAction !== null}
              onValueChange={(role) => onRoleChange(member.id, role)}
              value={member.role}
            >
              <SelectTrigger className="h-8 w-[7.5rem] capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Organizer</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        return (
          <Badge className="capitalize" variant="outline">
            {member.role}
          </Badge>
        );
      },
      header: 'Role',
      id: 'role',
      meta: { className: 'w-36' }
    },
    {
      cell: ({ row }) => {
        const member = row.original;
        const isYou = member.userId === viewerUserId;
        const isOwner = member.role === 'owner';
        if (canManage && !isOwner && !isYou) {
          return (
            <Button
              disabled={pendingAction !== null}
              onClick={() => onRemove(member.id)}
              size="sm"
              variant="ghost"
            >
              Remove
            </Button>
          );
        }
        if (isYou && !isOwner) {
          return (
            <Button disabled={pendingAction !== null} onClick={onLeave} size="sm" variant="ghost">
              Leave
            </Button>
          );
        }
        return null;
      },
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      id: 'actions',
      meta: { className: 'w-28 text-right' }
    }
  ];
}

export function MembersSection({
  canManage,
  onLeave,
  onRemove,
  onRoleChange,
  organization,
  pendingAction,
  viewerUserId
}: {
  canManage: boolean;
  onLeave: () => void;
  onRemove: (memberId: string) => void;
  onRoleChange: (memberId: string, role: string) => void;
  organization: ActiveOrganization;
  pendingAction: string | null;
  viewerUserId: string;
}) {
  const columns = useMemo(
    () =>
      memberColumns({
        canManage,
        onLeave,
        onRemove,
        onRoleChange,
        pendingAction,
        viewerUserId
      }),
    [canManage, onLeave, onRemove, onRoleChange, pendingAction, viewerUserId]
  );

  return (
    <DataTable
      columns={columns}
      data={organization.members}
      getRowId={(member) => member.id}
      globalFilterFn={memberFilter}
      resourceLabel={{ plural: 'members', singular: 'member' }}
    />
  );
}
