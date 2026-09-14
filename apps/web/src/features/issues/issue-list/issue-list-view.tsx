import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { useNavigate } from '@tanstack/react-router';
import { CircleDot, Plus } from 'lucide-react';
import { useIssueListAgentContext } from '@/features/issues/hooks/use-issues-agent-context';
import { useWorkspaceIssues } from '@/features/issues/hooks/use-workspace-issues';
import { CreateIssueDialog } from '@/features/issues/issue-list/create-issue-dialog';
import { useTrips } from '@/features/trips/hooks/use-trips';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { PaginatedListContent } from '@/features/workspace/workspace-list/paginated-list-content';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { IssueList } from './issue-list';

export function IssueListView() {
  const { isLoading, issues, loadMore, status } = useWorkspaceIssues();
  const { trips, isLoading: tripsLoading } = useTrips({ includeArchived: false });
  const { activeOrganization } = useWorkspace();
  const createDialog = useOpenState(false);
  const navigate = useNavigate();
  const creatableTrips = trips.filter((trip) => trip.archivedAt === null);

  useIssueListAgentContext(activeOrganization.name, issues);

  if (isLoading) return <PageLoading label="Loading issues…" />;

  return (
    <Shell>
      <Shell.Header>
        <Shell.Title data-testid={testIds.issuesTitle}>Issues</Shell.Title>
        <Shell.Description>
          <span className="sm:hidden">Issues the group still needs to settle.</span>
          <span className="hidden sm:inline">
            Capture decisions and blockers across every trip in the group.
          </span>
        </Shell.Description>
      </Shell.Header>
      {isLoading || issues.length > 0 ? (
        <Shell.Action
          data-testid={testIds.newIssue}
          icon={<Plus />}
          onClick={createDialog.openPanel}
          text="New issue"
        />
      ) : null}
      <Shell.Content>
        <CreateIssueDialog
          tripsLoading={tripsLoading}
          onClose={createDialog.closePanel}
          onCreated={(issueId) => {
            createDialog.closePanel();
            void navigate({ params: { issueId }, to: '/issues/$issueId' });
          }}
          open={createDialog.open}
          trips={creatableTrips.map((trip) => ({ id: trip.id, name: trip.name }))}
        />
        <PaginatedListContent
          empty={
            <EmptyScreen
              border
              buttonOnClick={createDialog.openPanel}
              buttonTestId={testIds.newIssue}
              buttonText="New issue"
              description="Turn a planning issue into something the group can discuss and close."
              headline="Nothing is blocking the group yet"
              icon={CircleDot}
            />
          }
          isEmpty={!isLoading && issues.length === 0}
          loadMoreLabel="Load more issues"
          onLoadMore={loadMore}
          status={status}
        >
          <IssueList
            emptyFilterMessage={(filter) =>
              filter === 'open'
                ? 'There are no open issues in this group.'
                : filter === 'closed'
                  ? 'There are no closed issues in this group.'
                  : 'There are no issues in this group.'
            }
            isLoading={isLoading}
            issues={issues}
            showTripName
          />
        </PaginatedListContent>
      </Shell.Content>
    </Shell>
  );
}
