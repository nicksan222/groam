import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { initials } from '@groam/ui/lib/avatar';
import { cn } from '@groam/ui/lib/utils';
import { Bot, UserRound } from 'lucide-react';
import type { IssueCardData } from '@/types/issues';

/**
 * Initials for a person, a bot for the Issue agent, a quiet silhouette when unassigned. Pass
 * `labelled` when no text beside it names the assignee, so it reads as an image with that name.
 */
export function IssueAssigneeAvatar({
  assignee,
  className,
  labelled = false
}: {
  assignee: IssueCardData['assignee'];
  className?: string;
  labelled?: boolean;
}) {
  const name = assignee?.name ?? 'Unassigned';
  const label = labelled ? { 'aria-label': name, role: 'img' } : {};
  if (assignee?.kind === 'user') {
    return (
      <Avatar className={cn('size-6', className)} title={name} {...label}>
        <AvatarFallback className="text-[9px]">{initials(name)}</AvatarFallback>
      </Avatar>
    );
  }
  const Icon = assignee ? Bot : UserRound;
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground',
        className
      )}
      title={name}
      {...label}
    >
      <Icon aria-hidden className="size-3.5" />
    </span>
  );
}
