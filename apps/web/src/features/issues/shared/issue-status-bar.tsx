import { cn } from '@groam/ui/lib/utils';
import { issueStatusMeta } from '@/features/issues/issue-status';
import type { IssueStatus } from '@/types/issues';

/**
 * A short Trello-style bar in the status tone, across the top of a card. Decorative: the lane or
 * a status label says the same in words.
 */
export function IssueStatusBar({ className, status }: { className?: string; status: IssueStatus }) {
  return (
    <span
      aria-hidden
      className={cn(
        'block h-1.5 w-10 shrink-0 rounded-full bg-current',
        issueStatusMeta[status].iconClassName,
        className
      )}
      data-status={status}
    />
  );
}
