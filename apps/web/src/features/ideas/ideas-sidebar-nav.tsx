import {
  SidebarMenuButton,
  SidebarMenuSkeleton,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@groam/ui/components/sidebar';
import { SidebarCollapsibleItem } from '@groam/ui/components/sidebar-collapsible-item';
import { SidebarNestedLoadMore } from '@groam/ui/components/sidebar-nested-load-more';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { cn } from '@groam/ui/lib/utils';
import { useLocation } from '@tanstack/react-router';
import { GitBranch } from 'lucide-react';
import { useViewerOpenIdeas, useWorkspaceIdeas } from '@/features/ideas/hooks/use-workspace-ideas';
import {
  isViewerDraft,
  mergeViewerOpenIdeas,
  pinViewerOpenIdeas,
  viewerDraftHighlightClass
} from '@/features/ideas/hooks/viewer-pending-idea';
import { useSidebarNestedPaging } from '@/features/workspace/hooks/use-sidebar-nested-paging';
import { useSidebarNestedVisible } from '@/features/workspace/hooks/use-sidebar-nested-visible';
import { useSidebarSectionOpen } from '@/features/workspace/hooks/use-sidebar-section-open';
import { Link, useParams } from '@/features/workspace/navigation/router';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { SIDEBAR_NESTED_PAGE_SIZE } from '@/features/workspace/workspace-sidebar/sidebar-nested-nav';
import { testIds } from '@/lib/test-ids';
import { ideaWorkspaceHref } from './idea-href';
import {
  filterOpenIdeas,
  isActiveOpenIdea,
  isIdeasIndexActive,
  showEmptyPortfolio
} from './ideas-sidebar-nav.helpers';

export function IdeasSidebarNav() {
  const workspace = useOptionalWorkspace();
  const { pathname } = useLocation();
  const params = useParams({ strict: false });
  const { setOpenMobile } = useSidebar();
  const { canExpandVisible, showMore, visibleCount } = useSidebarNestedVisible('ideas');

  const activeTripId = typeof params.tripId === 'string' ? params.tripId : null;
  const activeProposalId = typeof params.proposalId === 'string' ? params.proposalId : null;
  const ideasIndexActive = isIdeasIndexActive(pathname);
  const [sectionOpen, setSectionOpen] = useSidebarSectionOpen('ideas');
  const listOptions = sectionOpen
    ? { initialNumItems: SIDEBAR_NESTED_PAGE_SIZE }
    : ('skip' as const);
  const { isLoading, loadMore, proposals, status } = useWorkspaceIdeas(listOptions);
  const { proposals: viewerOpenIdeas } = useViewerOpenIdeas(sectionOpen ? undefined : 'skip');
  const viewerUserId = workspace?.session.user.id;
  const openIdeas = pinViewerOpenIdeas(
    filterOpenIdeas(mergeViewerOpenIdeas(proposals, viewerOpenIdeas)),
    viewerUserId
  );
  const visibleIdeas = openIdeas.slice(0, visibleCount);
  const { canFetchMore, canLoadMore, isLoadingMore, onLoadMore } = useSidebarNestedPaging({
    canExpandVisible,
    loadMore,
    showMore,
    status,
    total: openIdeas.length
  });
  const emptyPortfolio = showEmptyPortfolio(openIdeas.length, canFetchMore);

  return (
    <SidebarCollapsibleItem
      label="ideas"
      onOpenChange={setSectionOpen}
      open={sectionOpen}
      trigger={
        <SidebarMenuButton asChild isActive={ideasIndexActive} tooltip="Ideas">
          <Link data-testid={testIds.navIdeas} onClick={() => setOpenMobile(false)} to="/ideas">
            <GitBranch />
            <span>Ideas</span>
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
          <SidebarMenuSubButton asChild>
            <Link onClick={() => setOpenMobile(false)} to="/trips">
              <span>Browse trips</span>
            </Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      ) : (
        <>
          {visibleIdeas.map((proposal) => {
            const active = isActiveOpenIdea(proposal, activeProposalId, activeTripId);
            const draft = isViewerDraft(proposal, viewerUserId);
            const title = draft
              ? `Your draft · ${proposal.title} · ${proposal.sourceTripName}`
              : `${proposal.title} · ${proposal.sourceTripName}`;
            const href = ideaWorkspaceHref(proposal);
            const label = draft ? `Your draft: ${proposal.title}` : proposal.title;

            return (
              <SidebarMenuSubItem key={proposal.id}>
                <SidebarMenuSubButton
                  asChild
                  className={cn(draft && viewerDraftHighlightClass)}
                  data-viewer-draft={draft || undefined}
                  isActive={active}
                >
                  <Link
                    onClick={() => setOpenMobile(false)}
                    params={href.params}
                    search={'search' in href ? href.search : undefined}
                    title={title}
                    to={href.to}
                  >
                    <span>{label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
          {canLoadMore && (
            <SidebarNestedLoadMore isLoadingMore={isLoadingMore} onLoadMore={onLoadMore} />
          )}
        </>
      )}
    </SidebarCollapsibleItem>
  );
}
