import { cn } from '@groam/ui/lib/utils';
import { issueStatusMeta } from '@/features/issues/issue-status';
import type { IssueStatus } from '@/types/issues';

/** The status glyph in its semantic tone. Decorative: pair it with the status label. */
export function IssueStatusIcon({
  className,
  status
}: {
  className?: string;
  status: IssueStatus;
}) {
  const { icon: Icon, iconClassName } = issueStatusMeta[status];
  return <Icon aria-hidden className={cn('size-4 shrink-0', iconClassName, className)} />;
}
