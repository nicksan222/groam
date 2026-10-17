import { AgentContextProvider, useCurrentAgentContext } from '@groam/ai/ui/context/agent-context';
import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { manualCondition, starterCondition } from '@/features/issues/issue-condition-fixtures';
import {
  issueDetailScreenAgentContext,
  issueListScreenAgentContext,
  useIssueDetailAgentContext,
  useIssueListAgentContext
} from './use-issues-agent-context';
import type { WorkspaceIssue } from './use-workspace-issues';

const issueId = 'issue-1' as Id<'tripIssues'>;
const tripId = 'trip-1' as Id<'trips'>;
const issue = {
  id: issueId,
  status: 'open' as const,
  title: 'Choose a coast day',
  tripId,
  tripName: 'Portugal'
};
const workspaceIssue = issue as WorkspaceIssue;

function ListRegistration() {
  useIssueListAgentContext('Acme Labs', [workspaceIssue]);
  return null;
}

function DetailRegistration() {
  useIssueDetailAgentContext(issue);
  return null;
}

function Probe() {
  const context = useCurrentAgentContext();
  return <output aria-label="Issue agent context">{JSON.stringify(context)}</output>;
}

test('builds explicit list and detail screen context', async () => {
  expect(issueListScreenAgentContext('Acme Labs', [workspaceIssue])).toMatchObject({
    capabilities: [],
    data: {
      activeGroup: 'Acme Labs',
      issues: [
        {
          id: issueId,
          status: 'open',
          title: 'Choose a coast day',
          tripName: 'Portugal'
        }
      ]
    },
    key: 'issues:list',
    title: 'Issues'
  });

  expect(issueDetailScreenAgentContext(issue)).toMatchObject({
    capabilities: ['trip.status.read', 'trip.itinerary.read'],
    data: {
      doneWhen: null,
      issueId,
      status: 'open',
      title: 'Choose a coast day',
      tripName: 'Portugal'
    },
    key: `issue:${issueId}`,
    target: { kind: 'trip', section: 'issues', tripId },
    title: 'Portugal · Choose a coast day'
  });
});

test('tells the assistant what closes the issue and whether it holds', () => {
  expect(
    issueDetailScreenAgentContext({ ...issue, condition: starterCondition(true) }).data
  ).toMatchObject({
    doneWhen: { kind: 'rule', label: 'The trip has a destination', met: true }
  });
  expect(
    issueDetailScreenAgentContext({ ...issue, condition: manualCondition() }).data
  ).toMatchObject({
    doneWhen: { kind: 'manual', label: 'Flights confirmed', met: null }
  });
  expect(issueDetailScreenAgentContext({ ...issue, condition: null }).data).toMatchObject({
    doneWhen: null
  });
});

test('forwards issue screen changes through the shared context', async () => {
  const view = await render(
    <AgentContextProvider>
      <ListRegistration />
      <Probe />
    </AgentContextProvider>
  );
  expect(page.getByRole('status', { name: 'Issue agent context' }).element().textContent).toContain(
    'Acme Labs'
  );

  await view.rerender(
    <AgentContextProvider>
      <DetailRegistration />
      <Probe />
    </AgentContextProvider>
  );
  expect(page.getByRole('status', { name: 'Issue agent context' }).element().textContent).toContain(
    'Choose a coast day'
  );
});
