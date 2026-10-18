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
      polls: { isLoading: false, polls: [dashboardPoll()] },
      research: { isLoading: false, research: [dashboardResearch()] },
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
    agentRunsRecent: [{ status: 'running', title: 'Hotel shortlist' }],
    agentRunsWaitingOnYou: [{ title: 'Hotel shortlist' }],
    issuesAssignedToYou: [{ title: 'Book the ferry' }],
    openIssues: [{ id: 'other' }],
    pollsToVoteOn: [{ question: 'Which beach day?' }],
    recentResearch: [{ title: 'Train options', unread: false }]
  });
});
