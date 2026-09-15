import type { Id } from '@groam/backend/data-model';
import { AgentContextProvider, useCurrentAgentContext } from '@groam/ui/ai/context/agent-context';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
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

afterEach(cleanup);

test('builds explicit list and detail screen context', () => {
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

test('forwards issue screen changes through the shared context', () => {
  const view = render(
    <AgentContextProvider>
      <ListRegistration />
      <Probe />
    </AgentContextProvider>
  );
  expect(screen.getByRole('status', { name: 'Issue agent context' }).textContent).toContain(
    'Acme Labs'
  );

  view.rerender(
    <AgentContextProvider>
      <DetailRegistration />
      <Probe />
    </AgentContextProvider>
  );
  expect(screen.getByRole('status', { name: 'Issue agent context' }).textContent).toContain(
    'Choose a coast day'
  );
});
