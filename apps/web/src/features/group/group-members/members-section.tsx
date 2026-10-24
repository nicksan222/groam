import { Users } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { List } from '@groam/ui/components/list';
import { useMemo, useState } from 'react';
import type { ActiveOrganization } from '@/features/workspace/workspace-shell/workspace-state';
import { userIdentityLabel } from '@/lib/user-identity';
import { MemberRow } from './member-row';

const COLLAPSED_COUNT = 8;
const noun = { plural: 'members', singular: 'member' };
const sortOptions = [
  { label: 'Group order', value: 'default' },
  { label: 'Name A–Z', value: 'name' },
  { label: 'Role', value: 'role' }
];

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
  const [sort, setSort] = useState('default');
  const [expanded, setExpanded] = useState(false);
  const members = useMemo(() => {
    const matching = organization.members.filter((member) =>
      `${member.user.name} ${userIdentityLabel(member.user)} ${member.role}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
    if (sort === 'name') return matching.toSorted((a, b) => a.user.name.localeCompare(b.user.name));
    if (sort === 'role') return matching.toSorted((a, b) => a.role.localeCompare(b.role));
    return matching;
  }, [normalizedQuery, organization.members, sort]);

  const collapsed = !expanded && !normalizedQuery && members.length > COLLAPSED_COUNT;
  const visibleMembers = collapsed ? members.slice(0, COLLAPSED_COUNT) : members;

  return (
    <List bleed={false}>
      <List.Toolbar noun={noun} onQueryChange={setQuery} query={query}>
        <List.Sort noun={noun} onValueChange={setSort} options={sortOptions} value={sort} />
      </List.Toolbar>
      <List.Body>
        {members.length === 0 ? (
          <List.Empty
            headline={normalizedQuery ? 'No members match your search.' : 'No members yet.'}
            icon={Users}
          />
        ) : (
          <List.Group aria-label="Members">
            {visibleMembers.map((member) => (
              <MemberRow
                canManage={canManage}
                key={member.id}
                member={member}
                onLeave={onLeave}
                onRemove={onRemove}
                onRoleChange={onRoleChange}
                pendingAction={pendingAction}
                viewerUserId={viewerUserId}
              />
            ))}
          </List.Group>
        )}
        {collapsed ? (
          <Button
            className="mt-2 w-fit"
            onClick={() => setExpanded(true)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Show all {members.length} members
          </Button>
        ) : null}
      </List.Body>
    </List>
  );
}
