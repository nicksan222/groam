import { Ban, CircleCheck, CircleDashed, CircleDot, type Icon } from '@groam/icons';
import type { IssueStatus } from '@/types/issues';

/** Lifecycle order, also the board column order. */
export const ISSUE_STATUSES = [
  'open',
  'in_progress',
  'closed',
  'wont_do'
] as const satisfies readonly IssueStatus[];

export const issueStatusMeta: Record<
  IssueStatus,
  { icon: Icon; iconClassName: string; label: string }
> = {
  closed: { icon: CircleCheck, iconClassName: 'text-success-foreground', label: 'Done' },
  in_progress: { icon: CircleDot, iconClassName: 'text-warning-foreground', label: 'In progress' },
  open: { icon: CircleDashed, iconClassName: 'text-info-foreground', label: 'To decide' },
  wont_do: { icon: Ban, iconClassName: 'text-muted-foreground', label: "Won't do" }
};
