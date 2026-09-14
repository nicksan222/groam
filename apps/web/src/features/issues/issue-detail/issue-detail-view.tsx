import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageCrumbNav } from '@groam/ui/components/page-crumb-nav';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { Skeleton } from '@groam/ui/components/skeleton';
import { CircleDot } from 'lucide-react';
import { relativeIssueDate } from '@/features/issues/hooks/issue-relative-date';
import { useIssueDetailAgentContext } from '@/features/issues/hooks/use-issues-agent-context';
import { IssueStatusBadge } from '@/features/issues/issue-list/issue-status-badge';
import { useTripIssue } from '@/features/trips/hooks/use-trip-issues';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { IssueAgentBanner } from './issue-agent-banner';
import { IssueDetail } from './issue-detail';

export function IssueDetailView({ issueId }: { issueId: Id<'tripIssues'> }) {
  const { issue } = useTripIssue(issueId);
  const showLoading = issue === undefined;

  useIssueDetailAgentContext(issue);

  if (issue === null) {
    return (
      <EmptyScreen
        buttonRaw={
          <Button asChild variant="outline">
            <Link to="/issues">Back to issues</Link>
          </Button>
        }
        description="It may have been removed, or you do not have access to this trip."
        headline="Issue not found"
        icon={CircleDot}
      />
    );
  }

  if (showLoading) return <PageLoading label="Loading issue…" />;

  return (
    <Shell>
      <Shell.BannerLayout>
        <Shell.Banner className="border-b border-border/40">
          <Shell.BannerInset
            aria-busy={showLoading ? true : undefined}
            aria-label={showLoading ? 'Loading issue…' : undefined}
            className="flex min-w-0 flex-col gap-1.5 py-2.5 sm:py-3"
            role={showLoading ? 'status' : undefined}
          >
            <PageCrumbNav
              crumbs={
                showLoading
                  ? undefined
                  : [
                      {
                        asChild: true,
                        children: (
                          <Link
                            params={{ section: 'overview', tripId: issue.tripId }}
                            to="/trips/$tripId/$section"
                          />
                        ),
                        label: issue.tripName
                      }
                    ]
              }
              inset={false}
              isLoading={showLoading}
              parent={{
                asChild: true,
                children: <Link to="/issues" />,
                label: 'All issues'
              }}
            />
            {showLoading ? (
              <>
                <Skeleton className="h-7 w-[min(100%,24rem)]" />
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </>
            ) : (
              <>
                <Shell.Title
                  className="min-w-0 truncate"
                  data-issue-id={issue.id}
                  data-testid={testIds.issueHeading}
                >
                  {issue.title}
                  <span className="ml-2 font-normal text-muted-foreground">
                    #{issue.shortId ?? issue.id}
                  </span>
                </Shell.Title>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <IssueStatusBadge status={issue.status} />
                  <p className="min-w-0 truncate text-xs text-muted-foreground">
                    opened by{' '}
                    <span className="font-medium text-foreground">{issue.author.name}</span>
                    {' · '}
                    {relativeIssueDate(issue.updatedAt)}
                  </p>
                </div>
              </>
            )}
          </Shell.BannerInset>
        </Shell.Banner>
        <Shell.PageBody maxWidthClassName="max-w-[1600px]" variant="detail">
          {!showLoading && issue.assignee?.kind === 'agent' ? (
            <IssueAgentBanner issueId={issueId} />
          ) : null}
          <IssueDetail isLoading={showLoading} issueId={issueId} />
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}
