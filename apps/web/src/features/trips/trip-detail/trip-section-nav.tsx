import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import type { Id } from '@groam/backend/data-model';
import { matchesIdeaStatus } from '@/features/ideas/hooks/idea-list-filter';
import { isViewerDraft } from '@/features/ideas/hooks/viewer-pending-idea';
import { useTripResearches } from '@/features/research/hooks/use-trip-researches';
import { useTripIssues } from '@/features/trips/hooks/use-trip-issues';
import { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import { tripSectionLabels, tripTabSections } from '@/features/trips/trip-sections';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import type { TabCounts, TripSection, TripSectionNavProps } from '@/types/trips';
import { TripTabs } from './trip-tabs';

const tabTestIds: Record<(typeof tripTabSections)[number], string> = {
  activity: testIds.tripSectionActivity,
  board: testIds.tripSectionBoard,
  ideas: testIds.tripSectionIdeas,
  issues: testIds.tripSectionIssues,
  overview: testIds.tripSectionOverview,
  polls: testIds.tripSectionPolls,
  research: testIds.tripSectionResearch
};

/** Issues, ideas, and research show a count; the other tabs are plain. */
function tabCount(section: TripSection, counts: TabCounts): number | string | undefined {
  if (section === 'issues') return counts.issues;
  if (section === 'ideas') return counts.ideas;
  if (section === 'research') return counts.research;
  return undefined;
}

/** The tab strip under the cover: Board, Overview, Issues, Ideas, Polls, Research, Activity. */
export function TripSectionNav(props: TripSectionNavProps) {
  if (props.isLoading) {
    return (
      <TripSectionTabs
        counts={{ ideas: '…', issues: '…', research: '…' }}
        disabled
        section={props.section}
      />
    );
  }
  return <TripSectionNavLoaded {...props} />;
}

function TripSectionNavLoaded({
  onOpen,
  section,
  tripId
}: {
  onOpen: (section: TripSection) => void;
  section: TripSection;
  tripId: Id<'trips'>;
}) {
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const { issues } = useTripIssues(tripId);
  const { proposals } = useTripVersions(tripId);
  const { isLoading: researchLoading, researches } = useTripResearches(tripId);
  const activeIssues = issues?.filter((issue) => !isResolved(issue.status)).length;
  const openIdeas = proposals?.filter(
    (proposal) =>
      matchesIdeaStatus(proposal.status, 'pending') &&
      (proposal.status !== 'draft' || isViewerDraft(proposal, viewerUserId))
  ).length;

  return (
    <TripSectionTabs
      counts={{
        ideas: openIdeas ?? '…',
        issues: activeIssues ?? '…',
        research: researchLoading ? '…' : researches.length
      }}
      onOpen={onOpen}
      section={section}
    />
  );
}

function TripSectionTabs({
  counts,
  disabled = false,
  onOpen,
  section
}: {
  counts: TabCounts;
  disabled?: boolean;
  onOpen?: (section: TripSection) => void;
  section: TripSection;
}) {
  return (
    <TripTabs
      activeKey={section}
      ariaLabel="Trip sections"
      disabled={disabled}
      onOpen={onOpen}
      tabs={tripTabSections.map((tab) => ({
        count: tabCount(tab, counts),
        key: tab,
        label: tripSectionLabels[tab],
        testId: tabTestIds[tab]
      }))}
    />
  );
}
