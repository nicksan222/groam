import { describe, expect, test } from 'vite-plus/test';
import {
  assignedToViewer,
  dashboardIssue,
  dashboardRun,
  NOW
} from '@/features/dashboard/testing/dashboard-activity-fixtures';
import {
  selectActivityRuns,
  selectAssignedIssues,
  selectOpenIssues,
  selectWaitingRuns
} from './dashboard-activity-model';

const id = (value: string) => value as never;

describe('selectWaitingRuns', () => {
  test('keeps only waiting runs, newest first, capped at 3', () => {
    const runs = [
      dashboardRun({ id: id('a'), status: 'waiting', updatedAt: NOW - 3 }),
      dashboardRun({ id: id('b'), status: 'running' }),
      dashboardRun({ id: id('c'), status: 'waiting', updatedAt: NOW - 1 }),
      dashboardRun({ id: id('d'), status: 'waiting', updatedAt: NOW - 2 }),
      dashboardRun({ id: id('e'), status: 'waiting', updatedAt: NOW - 4 })
    ];
    expect(selectWaitingRuns(runs).map((run) => run.id)).toEqual(['c', 'd', 'a']);
  });
});

describe('selectActivityRuns', () => {
  test('puts in-flight runs first, skips waiting ones, caps at 4', () => {
    const runs = [
      dashboardRun({ id: id('done-new'), status: 'complete', updatedAt: NOW }),
      dashboardRun({ id: id('wait'), status: 'waiting' }),
      dashboardRun({ id: id('run'), status: 'running', updatedAt: NOW - 100 }),
      dashboardRun({ id: id('queued'), status: 'queued', updatedAt: NOW - 200 }),
      dashboardRun({ id: id('failed'), status: 'failed', updatedAt: NOW - 50 }),
      dashboardRun({ id: id('done-old'), status: 'complete', updatedAt: NOW - 500 })
    ];
    expect(selectActivityRuns(runs).map((run) => run.id)).toEqual([
      'run',
      'queued',
      'done-new',
      'failed'
    ]);
  });
});

describe('issue selectors', () => {
  const issues = [
    dashboardIssue({ assignee: assignedToViewer, id: id('mine-open'), status: 'open' }),
    dashboardIssue({ assignee: assignedToViewer, id: id('mine-done'), status: 'closed' }),
    dashboardIssue({
      assignee: { kind: 'user', name: 'Sam', userId: 'user-2' },
      id: id('theirs'),
      status: 'in_progress'
    }),
    dashboardIssue({ assignee: null, id: id('nobody'), status: 'open' }),
    dashboardIssue({ id: id('wont'), status: 'wont_do' })
  ];

  test('assigned issues are the viewer’s active ones', () => {
    expect(selectAssignedIssues(issues, 'user-1').map((issue) => issue.id)).toEqual(['mine-open']);
  });

  test('open issues exclude the viewer’s own and resolved ones', () => {
    expect(selectOpenIssues(issues, 'user-1').map((issue) => issue.id)).toEqual([
      'theirs',
      'nobody'
    ]);
  });

  test('open issues cap at 4 and an agent assignee is not the viewer', () => {
    const many = Array.from({ length: 6 }, (_, index) =>
      dashboardIssue({ id: id(`i${index}`), updatedAt: NOW - index })
    );
    expect(selectOpenIssues(many, 'user-1')).toHaveLength(4);
    const agentOwned = dashboardIssue({
      assignee: { agentId: 'reviewer', kind: 'agent', name: 'Reviewer' } as never
    });
    expect(selectAssignedIssues([agentOwned], 'user-1')).toEqual([]);
  });
});
