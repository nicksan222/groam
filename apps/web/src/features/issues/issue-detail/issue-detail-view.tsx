import type { Id } from '@groam/backend/data-model';
import { CircleDot, Link2 } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { toast } from '@groam/ui/components/toast';
import { useIssueDetailAgentContext } from '@/features/issues/hooks/use-issues-agent-context';
import { useRememberTrip } from '@/features/trips/hooks/use-remember-trip';
import { useTripIssue } from '@/features/trips/hooks/use-trip-issues';
import { useTripRecord } from '@/features/trips/hooks/use-trip-record';
import { Link } from '@/features/workspace/navigation/router';
import { absoluteHref } from '@/lib/navigation/base-path';
import { testIds } from '@/lib/test-ids';
import { IssueAgentBanner } from './issue-agent-banner';
import { IssueDetail } from './issue-detail';
import { IssueDetailMeta } from './issue-detail-meta';

async function copyIssueLink(shortId: string) {
  const url = absoluteHref(`/issues/${shortId}`);
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Issue link copied');
  } catch {
    toast.error('Unable to copy issue link');
  }
}

export function IssueDetailView({ issueId }: { issueId: Id<'tripIssues'> }) {
  const { issue, ...actions } = useTripIssue(issueId);

  useIssueDetailAgentContext(issue);
  // The URL has no trip, so the page remembers its own: the top bar and sidebar name it.
  useRememberTrip(useTripRecord(issue?.tripId) ?? undefined);

  if (issue === null) {
    return (
      <EmptyScreen
        buttonRaw={
          <Button asChild variant="outline">
            <Link to="/">Back to Home</Link>
          </Button>
        }
        description="It may have been removed, or you do not have access to this trip."
        headline="Issue not found"
        icon={CircleDot}
      />
    );
  }

  if (issue === undefined) {
    return (
      <Shell>
        <Shell.BannerLayout>
          <PageLoading label="Loading issue…" />
        </Shell.BannerLayout>
      </Shell>
    );
  }

  return (
    <Shell>
      <Shell.BannerLayout>
        <Shell.Header
          actions={
            <Shell.Action
              icon={Link2}
              iconOnly
              label={`Copy link to issue ${issue.shortId}`}
              onClick={() => void copyIssueLink(issue.shortId)}
              title={`Copy link · #${issue.shortId}`}
              tone="secondary"
            />
          }
          meta={<IssueDetailMeta issue={issue} />}
          parent={
            <Link params={{ section: 'issues', tripId: issue.tripId }} to="/trips/$tripId/$section">
              Issues
            </Link>
          }
          title={issue.title}
          titleProps={{ 'data-issue-id': issue.id, 'data-testid': testIds.issueHeading }}
        />
        <Shell.PageBody>
          {issue.assignee?.kind === 'agent' ? <IssueAgentBanner issueId={issue.id} /> : null}
          <IssueDetail issue={issue} {...actions} />
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}
