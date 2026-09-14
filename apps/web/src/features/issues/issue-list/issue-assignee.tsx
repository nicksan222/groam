import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { initials } from '@groam/ui/lib/avatar';
import { Bot, UserRound } from 'lucide-react';

export function IssueAssignee({
  assignee
}: {
  assignee: {
    kind: 'agent' | 'user';
    name: string;
  } | null;
}) {
  const name = assignee?.name ?? 'Unassigned';
  return (
    <span className="flex min-w-0 items-center gap-2" title={name}>
      <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
        {assignee?.kind === 'agent' ? (
          <Bot className="size-3.5" />
        ) : assignee?.kind === 'user' ? (
          <Avatar className="size-6">
            <AvatarFallback className="text-[9px]">{initials(assignee.name)}</AvatarFallback>
          </Avatar>
        ) : (
          <UserRound className="size-3.5" />
        )}
      </span>
      <span className="min-w-0 truncate text-muted-foreground">{name}</span>
    </span>
  );
}
