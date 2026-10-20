import type { AgentScreenContext } from '@groam/ai/ui/context/agent-context';
import type { DashboardBuckets } from '@/features/dashboard/hooks/dashboard-model';
import type { useDashboardIssues } from './use-dashboard-issues';
import type { useDashboardPolls } from './use-dashboard-polls';
import type { useDashboardResearch } from './use-dashboard-research';
import type { useDashboardRuns } from './use-dashboard-runs';

// oxlint-disable-next-line groam/no-local-type-definitions -- derived from this hook's own return
export type DashboardActivityContext = {
  issues: ReturnType<typeof useDashboardIssues>;
  polls: ReturnType<typeof useDashboardPolls>;
  research: ReturnType<typeof useDashboardResearch>;
  runs: ReturnType<typeof useDashboardRuns>;
};

function activityData({ issues, polls, research, runs }: DashboardActivityContext) {
  return {
    activityPreviewScope: 'initial-pages',
    pollsMoreAvailable: polls.isLoading ? null : polls.canLoadMore || polls.isLoadingMore,
    pollsPreviewLoading: polls.isLoading || polls.isLoadingMore,
    researchMoreAvailable: research.isLoading
      ? null
      : research.canLoadMore || research.isLoadingMore,
    researchPreviewLoading: research.isLoading || research.isLoadingMore,
    agentRunsRecent: runs.activity.map((run) => ({
      agent: run.agentId,
      id: run.id,
      status: run.status,
      title: run.title
    })),
    agentRunsWaitingOnYou: runs.waiting.map((run) => ({ id: run.id, title: run.title })),
    issuesAssignedToYou: issues.assigned.map((issue) => ({
      id: issue.id,
      status: issue.status,
      title: issue.title,
      trip: issue.tripName
    })),
    openIssues: issues.open.map((issue) => ({
      id: issue.id,
      status: issue.status,
      title: issue.title,
      trip: issue.tripName
    })),
    pollsToVoteOn: polls.polls.map((poll) => ({
      id: poll.id,
      question: poll.question,
      trip: poll.tripName
    })),
    recentResearch: research.research.map((item) => ({
      id: item.id,
      title: item.title,
      trip: item.tripName,
      unread: item.unread
    }))
  };
}

/** The home's screen context; `activity` is omitted while its sources are unavailable. */
export function buildDashboardContext({
  activity,
  buckets,
  groupName
}: {
  activity?: DashboardActivityContext;
  buckets: DashboardBuckets | null;
  groupName: string;
}): AgentScreenContext {
  return {
    capabilities: [],
    data: {
      activeTripCount: buckets?.activeTrips.length ?? 0,
      groupName,
      pendingProposalCount: buckets?.yourDrafts.length ?? 0,
      reviewRequestCount: buckets?.waitingOnYou.length ?? 0,
      tripsNeedingAttention:
        buckets?.tripsNeedingAttention.map((trip) => ({
          id: trip.id,
          name: trip.name,
          nextAction: trip.nextAction
        })) ?? [],
      ...(activity ? activityData(activity) : {})
    },
    description:
      'Summarize what is going on in the group: what needs the viewer first (idea reviews, waiting agent runs, assigned issues, polls to vote on), then agent activity, open issues, research, and trips needing attention. Polls and research are independent initial bounded previews; more items may have been loaded on screen. Query tools before assuming completeness or that an empty preview means no items exist.',
    key: 'workspace:dashboard',
    title: `${groupName} · Home`
  };
}
