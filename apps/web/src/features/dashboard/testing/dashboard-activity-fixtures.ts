import type { Id } from '@groam/backend/data-model';
import type { WorkspaceAgentRun } from '@/features/agents/hooks/use-workspace-agent-runs';
import { workspaceIssue } from '@/features/issues/issue-fixtures';
import type { DashboardPoll } from '@/types/dashboard';
import type { DashboardResearch } from '@/types/dashboard';
import type { WorkspaceIssue } from '@/types/issues';

export const NOW = Date.now();

export function dashboardRun(overrides: Partial<WorkspaceAgentRun> = {}): WorkspaceAgentRun {
  return {
    agentId: 'reviewer',
    completedAt: null,
    createdBy: { name: 'Alex', userId: 'user-alex' },
    discussionId: null,
    error: null,
    headline: 'Comparing hotels',
    id: 'run-1' as WorkspaceAgentRun['id'],
    issueId: null,
    kickoff: 'assign',
    proposalId: null,
    related: { chatTitle: null, ideaTitle: null, issueTitle: null, tripName: null },
    report: null,
    shortId: 'runabc',
    startedAt: null,
    status: 'running',
    surface: 'standalone',
    threadId: null,
    title: 'Hotel shortlist',
    tripId: null,
    updatedAt: NOW,
    ...overrides
  };
}

export function dashboardIssue(overrides: Partial<WorkspaceIssue> = {}): WorkspaceIssue {
  return workspaceIssue({ title: 'Book the ferry', updatedAt: NOW, ...overrides });
}

export const assignedToViewer: WorkspaceIssue['assignee'] = {
  kind: 'user',
  name: 'Viewer',
  userId: 'user-1'
};

export function dashboardPoll(overrides: Partial<DashboardPoll> = {}): DashboardPoll {
  return {
    closesAt: null,
    createdAt: NOW,
    discussionId: null,
    id: 'poll-1' as Id<'polls'>,
    optionCount: 3,
    question: 'Which beach day?',
    tripId: 'trip-1' as Id<'trips'>,
    tripName: 'Atlantic week',
    viewerHasVoted: false,
    votedCount: 2,
    ...overrides
  };
}

export function dashboardResearch(overrides: Partial<DashboardResearch> = {}): DashboardResearch {
  return {
    id: 'rs-1' as Id<'discussions'>,
    lastActivityAt: NOW,
    lastMessage: { authorName: 'Lea', text: 'Found a cheaper train' },
    shortId: 'rsabc',
    title: 'Train options',
    tripId: 'trip-1' as Id<'trips'>,
    tripName: 'Atlantic week',
    unread: false,
    ...overrides
  };
}
