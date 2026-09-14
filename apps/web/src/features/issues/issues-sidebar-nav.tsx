import {
  SidebarMenuButton,
  SidebarMenuSkeleton,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@groam/ui/components/sidebar';
import { SidebarCollapsibleItem } from '@groam/ui/components/sidebar-collapsible-item';
import { SidebarNestedLoadMore } from '@groam/ui/components/sidebar-nested-load-more';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { CircleDot } from 'lucide-react';
import { CreateIssueDialog } from '@/features/issues/issue-list/create-issue-dialog';
import { useTrips } from '@/features/trips/hooks/use-trips';
import { useSidebarNestedPaging } from '@/features/workspace/hooks/use-sidebar-nested-paging';
import { useSidebarNestedVisible } from '@/features/workspace/hooks/use-sidebar-nested-visible';
import { useSidebarSectionOpen } from '@/features/workspace/hooks/use-sidebar-section-open';
import { Link, useParams } from '@/features/workspace/navigation/router';
import { SIDEBAR_NESTED_PAGE_SIZE } from '@/features/workspace/workspace-sidebar/sidebar-nested-nav';
import { testIds } from '@/lib/test-ids';
import { useWorkspaceIssues } from './hooks/use-workspace-issues';
import {
  filterOpenIssues,
  isIssuesIndexActive,
  showEmptyIssuePortfolio
} from './issues-sidebar-nav.helpers';

export function IssuesSidebarNav() {
  const { pathname } = useLocation();
  const params = useParams({ strict: false });
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const { canExpandVisible, closeCreate, isCreateOpen, openCreate, showMore, visibleCount } =
    useSidebarNestedVisible('issues');

  const activeIssueId = typeof params.issueId === 'string' ? params.issueId : null;
  const issuesIndexActive = isIssuesIndexActive(pathname);
  const [sectionOpen, setSectionOpen] = useSidebarSectionOpen('issues');
  const { isLoading, issues, loadMore, status } = useWorkspaceIssues(
    sectionOpen ? { initialNumItems: SIDEBAR_NESTED_PAGE_SIZE } : 'skip'
  );
  const { trips, isLoading: tripsLoading } = useTrips(
    sectionOpen || isCreateOpen
      ? { includeArchived: false, initialNumItems: SIDEBAR_NESTED_PAGE_SIZE }
      : 'skip'
  );
  const openIssues = filterOpenIssues(issues);
  const visibleIssues = openIssues.slice(0, visibleCount);
  const { canFetchMore, canLoadMore, isLoadingMore, onLoadMore } = useSidebarNestedPaging({
    canExpandVisible,
    loadMore,
    showMore,
    status,
    total: openIssues.length
  });
  const emptyPortfolio = showEmptyIssuePortfolio(openIssues.length, canFetchMore);

  return (
    <>
      <SidebarCollapsibleItem
        label="issues"
        onOpenChange={setSectionOpen}
        open={sectionOpen}
        trigger={
          <SidebarMenuButton asChild isActive={issuesIndexActive} tooltip="Issues">
            <Link data-testid={testIds.navIssues} onClick={() => setOpenMobile(false)} to="/issues">
              <CircleDot />
              <span>Issues</span>
            </Link>
          </SidebarMenuButton>
        }
      >
        {isLoading ? (
          <>
            <SidebarMenuSkeleton />
            <SidebarMenuSkeleton />
            <SidebarMenuSkeleton />
          </>
        ) : emptyPortfolio ? (
          <SidebarMenuSubItem>
            <SidebarMenuSubButton onClick={openCreate}>
              <span>New issue</span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ) : (
          <>
            {visibleIssues.map((issue) => (
              <SidebarMenuSubItem key={issue.id}>
                <SidebarMenuSubButton asChild isActive={activeIssueId === issue.id}>
                  <Link
                    onClick={() => setOpenMobile(false)}
                    params={{ issueId: issue.id }}
                    title={`${issue.title} · ${issue.tripName}`}
                    to="/issues/$issueId"
                  >
                    <span>{issue.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
            {canLoadMore && (
              <SidebarNestedLoadMore isLoadingMore={isLoadingMore} onLoadMore={onLoadMore} />
            )}
          </>
        )}
      </SidebarCollapsibleItem>
      <CreateIssueDialog
        tripsLoading={tripsLoading}
        onClose={closeCreate}
        onCreated={(issueId) => {
          closeCreate();
          setOpenMobile(false);
          void navigate({ params: { issueId }, to: '/issues/$issueId' });
        }}
        open={isCreateOpen}
        trips={trips.map((trip) => ({ id: trip.id, name: trip.name }))}
      />
    </>
  );
}
