import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { Button } from '@groam/ui/components/button';
import { RecordList } from '@groam/ui/components/record-list';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { RecordListItem } from '@groam/ui/components/record-list-item';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { initials } from '@groam/ui/lib/avatar';
import { useState } from 'react';
import type { ActiveOrganization } from '@/features/workspace/workspace-shell/workspace-state';
import { userIdentityLabel } from '@/lib/user-identity';

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
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const members = organization.members.filter((member) =>
    `${member.user.name} ${userIdentityLabel(member.user)} ${member.role}`
      .toLowerCase()
      .includes(normalizedQuery)
  );

  return (
    <RecordList
      empty={normalizedQuery ? 'No members match your search.' : 'No members yet.'}
      getKey={(member) => member.id}
      items={members}
      onQueryChange={setQuery}
      query={query}
      resourceLabel={{ plural: 'members', singular: 'member' }}
      sortOptions={[
        { label: 'Group order', value: 'default' },
        {
          compare: (a, b) => a.user.name.localeCompare(b.user.name),
          label: 'Name A–Z',
          value: 'name'
        },
        { compare: (a, b) => a.role.localeCompare(b.role), label: 'Role', value: 'role' }
      ]}
      renderItem={(member) => {
        const isYou = member.userId === viewerUserId;
        const isOwner = member.role === 'owner';
        const canEdit = canManage && !isOwner && !isYou;
        return (
          <RecordListItem
            icon={
              <Avatar className="size-7 shrink-0">
                <AvatarImage alt={member.user.name} src={member.user.image ?? ''} />
                <AvatarFallback className="text-[11px] leading-none font-medium tracking-normal">
                  {initials(member.user.name)}
                </AvatarFallback>
              </Avatar>
            }
            title={
              <span>
                {member.user.name}
                {isYou ? ' (you)' : ''}
              </span>
            }
            metadata={<span className="truncate">{userIdentityLabel(member.user)}</span>}
            badges={
              <>
                {canEdit ? (
                  <Select
                    disabled={pendingAction !== null}
                    onValueChange={(role) => onRoleChange(member.id, role)}
                    value={member.role}
                  >
                    <SelectTrigger
                      aria-label={`Role for ${member.user.name}`}
                      className="h-11 w-24 md:h-6 border-border/60 bg-background/40 text-xs text-muted-foreground capitalize shadow-none"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Organizer</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <RecordListBadge className="capitalize">{member.role}</RecordListBadge>
                )}
                {canEdit ? (
                  <Button
                    disabled={pendingAction !== null}
                    onClick={() => onRemove(member.id)}
                    size="sm"
                    variant="ghost"
                    className="h-11 px-2 md:h-6 text-xs text-muted-foreground"
                  >
                    Remove
                  </Button>
                ) : isYou && !isOwner ? (
                  <Button
                    disabled={pendingAction !== null}
                    onClick={onLeave}
                    size="sm"
                    variant="ghost"
                    className="h-11 px-2 md:h-6 text-xs text-muted-foreground"
                  >
                    Leave
                  </Button>
                ) : null}
              </>
            }
          />
        );
      }}
    />
  );
}
