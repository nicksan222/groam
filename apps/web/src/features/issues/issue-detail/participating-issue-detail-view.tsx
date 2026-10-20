import type { Id } from '@groam/backend/data-model';
import { CircleDot } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageCrumbNav } from '@groam/ui/components/page-crumb-nav';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { useIssueDetailAgentContext } from '@/features/issues/hooks/use-issues-agent-context';
import { useTripIssue } from '@/features/trips/hooks/use-trip-issues';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { IssueAgentBanner } from './issue-agent-banner';
import { IssueDetail } from './issue-detail';
import { IssueDetailMeta } from './issue-detail-meta';

export function ParticipatingIssueDetailView({ issueId }: { issueId: Id<'tripIssues'> }) {
  const { issue, ...actions } = useTripIssue(issueId);

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

  if (issue === undefined) return <PageLoading label="Loading issue…" />;

  return (
    <Shell>
      <Shell.BannerLayout>
        <Shell.Banner className="border-b border-border/40">
          <Shell.BannerInset className="flex min-w-0 flex-col gap-1.5 py-2.5 sm:py-3">
            <PageCrumbNav
              crumbs={[
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
              ]}
              inset={false}
              parent={{
                asChild: true,
                children: <Link to="/issues" />,
                label: 'All issues'
              }}
            />
            <Shell.Title
              className="min-w-0 truncate"
              data-issue-id={issue.id}
              data-testid={testIds.issueHeading}
            >
              {issue.title}
              <span className="ml-2 font-normal text-muted-foreground">#{issue.shortId}</span>
            </Shell.Title>
            <IssueDetailMeta issue={issue} />
          </Shell.BannerInset>
        </Shell.Banner>
        <Shell.PageBody maxWidthClassName="max-w-[1600px]" variant="detail">
          {issue.assignee?.kind === 'agent' ? <IssueAgentBanner issueId={issue.id} /> : null}
          <IssueDetail issue={issue} {...actions} />
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}
