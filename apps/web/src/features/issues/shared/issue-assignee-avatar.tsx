import { Bot, UserRound } from '@groam/icons';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { IconTile } from '@groam/ui/components/icon-tile';
import { initials } from '@groam/ui/lib/avatar';
import { cn } from '@groam/ui/lib/utils';
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
    <IconTile className={className} radius="full" size="xs" title={name} variant="muted" {...label}>
      <Icon aria-hidden className="size-3.5" />
    </IconTile>
  );
}
