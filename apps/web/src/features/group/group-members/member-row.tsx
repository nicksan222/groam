import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { List } from '@groam/ui/components/list';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { initials } from '@groam/ui/lib/avatar';
import type { ActiveOrganization } from '@/features/workspace/workspace-shell/workspace-state';
import { userIdentityLabel } from '@/lib/user-identity';

export function MemberRow({
  canManage,
  member,
  onLeave,
  onRemove,
  onRoleChange,
  pendingAction,
  viewerUserId
}: {
  canManage: boolean;
  member: ActiveOrganization['members'][number];
  onLeave: () => void;
  onRemove: (memberId: string) => void;
  onRoleChange: (memberId: string, role: string) => void;
  pendingAction: string | null;
  viewerUserId: string;
}) {
  const isYou = member.userId === viewerUserId;
  const isOwner = member.role === 'owner';
  const canEdit = canManage && !isOwner && !isYou;
  const identity = userIdentityLabel(member.user);
  const hasIdentity = identity !== member.user.name;
  return (
    <List.Row className={hasIdentity ? undefined : 'items-center md:gap-y-0'}>
      <List.Icon media>
        <Avatar className="size-7 shrink-0">
          <AvatarImage alt={member.user.name} src={member.user.image ?? ''} />
          <AvatarFallback className="text-[11px] leading-none font-medium tracking-normal">
            {initials(member.user.name)}
          </AvatarFallback>
        </Avatar>
      </List.Icon>
      <List.Main>
        <List.Title>
          {member.user.name}
          {isYou ? ' (you)' : ''}
        </List.Title>
        {hasIdentity ? <List.Description>{identity}</List.Description> : null}
      </List.Main>
      <List.Actions>
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
          <Badge className="capitalize" variant="outline">
            {member.role}
          </Badge>
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
      </List.Actions>
    </List.Row>
  );
}
