import { expect, test } from 'vite-plus/test';
import {
  assignedToViewer,
  dashboardIssue,
  dashboardPoll,
  dashboardResearch,
  dashboardRun
} from '@/features/dashboard/testing/dashboard-activity-fixtures';
import { buildDashboardContext } from './dashboard-agent-context';

test('without activity it carries only the base data', () => {
  const context = buildDashboardContext({ buckets: null, groupName: 'Acme' });
  expect(context).toMatchObject({ key: 'workspace:dashboard', title: 'Acme · Home' });
  expect(context.data).not.toHaveProperty('pollsToVoteOn');
});

test('with activity it lists the visible runs, issues, polls and research', () => {
  const context = buildDashboardContext({
    activity: {
      issues: {
        assigned: [dashboardIssue({ assignee: assignedToViewer })],
        isLoading: false,
        open: [dashboardIssue({ id: 'other' as never })]
      },
      polls: {
        canLoadMore: false,
        isLoadingMore: false,
        loadMore: () => {},
        isLoading: false,
        polls: [dashboardPoll()]
      },
      research: {
        canLoadMore: false,
        isLoadingMore: false,
        loadMore: () => {},
        isLoading: false,
        research: [dashboardResearch()]
      },
      runs: {
        activity: [dashboardRun()],
        isLoading: false,
        waiting: [dashboardRun({ status: 'waiting' })]
      }
    },
    buckets: null,
    groupName: 'Acme'
  });
  expect(context.data).toMatchObject({
    activityPreviewScope: 'initial-pages',
    pollsMoreAvailable: false,
    pollsPreviewLoading: false,
    researchMoreAvailable: false,
    researchPreviewLoading: false,
    agentRunsRecent: [{ status: 'running', title: 'Hotel shortlist' }],
    agentRunsWaitingOnYou: [{ title: 'Hotel shortlist' }],
    issuesAssignedToYou: [{ title: 'Book the ferry' }],
    openIssues: [{ id: 'other' }],
    pollsToVoteOn: [{ question: 'Which beach day?' }],
    recentResearch: [{ title: 'Train options', unread: false }]
  });
});

test.each(['loading', 'more', 'loading-more'])(
  'empty initial activity previews preserve %s metadata rather than imply absence',
  (status) => {
    const preview = {
      canLoadMore: status === 'more',
      isLoadingMore: status === 'loading-more',
      isLoading: status === 'loading',
      loadMore: () => {}
    };
    const context = buildDashboardContext({
      buckets: null,
      groupName: 'Acme',
      activity: {
        issues: { assigned: [], open: [], isLoading: false },
        runs: { activity: [], waiting: [], isLoading: false },
        polls: { ...preview, polls: [] },
        research: { ...preview, research: [] }
      }
    });
    expect(context.data).toMatchObject({
      activityPreviewScope: 'initial-pages',
      pollsToVoteOn: [],
      recentResearch: [],
      pollsMoreAvailable: status === 'loading' ? null : true,
      researchMoreAvailable: status === 'loading' ? null : true,
      pollsPreviewLoading: status !== 'more',
      researchPreviewLoading: status !== 'more'
    });
    expect(context.description).toContain('more items may have been loaded on screen');
    expect(context.description).toContain('Query tools before assuming completeness');
  }
);
