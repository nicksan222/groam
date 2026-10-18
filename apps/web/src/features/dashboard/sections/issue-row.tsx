import { ArrowRight } from 'lucide-react';
import type { WorkspaceIssue } from '@/features/issues/hooks/use-workspace-issues';
import { IssueStatusBadge } from '@/features/issues/shared/issue-status-badge';
import { Link } from '@/features/workspace/navigation/router';

export function IssueRow({ issue, testId }: { issue: WorkspaceIssue; testId: string }) {
  return (
    <Link
      className="group flex min-w-0 items-center justify-between gap-3 border-b border-border p-3 last:border-b-0 hover:bg-muted/60"
      data-testid={testId}
      params={{ issueId: issue.id }}
      to="/issues/$issueId"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-muted-foreground">
          {issue.tripName} · {issue.assignee?.name ?? 'Unassigned'}
        </span>
        <span className="mt-1 block truncate text-sm font-semibold text-foreground">
          {issue.title}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <IssueStatusBadge status={issue.status} />
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </span>
    </Link>
  );
}
