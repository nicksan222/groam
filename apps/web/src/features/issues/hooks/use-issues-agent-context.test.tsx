import { AgentContextProvider, useCurrentAgentContext } from '@groam/ai/ui/context/agent-context';
import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { manualCondition, starterCondition } from '@/features/issues/issue-condition-fixtures';
import {
  issueDetailScreenAgentContext,
  useIssueDetailAgentContext
} from './use-issues-agent-context';

const issueId = 'issue-1' as Id<'tripIssues'>;
const tripId = 'trip-1' as Id<'trips'>;
const issue = {
  id: issueId,
  status: 'open' as const,
  title: 'Choose a coast day',
  tripId,
  tripName: 'Portugal'
};
function DetailRegistration() {
  useIssueDetailAgentContext(issue);
  return null;
}

function Probe() {
  const context = useCurrentAgentContext();
  return <output aria-label="Issue agent context">{JSON.stringify(context)}</output>;
}

test('builds explicit detail screen context', async () => {
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
  await render(
    <AgentContextProvider>
      <DetailRegistration />
      <Probe />
    </AgentContextProvider>
  );
  expect(page.getByRole('status', { name: 'Issue agent context' }).element().textContent).toContain(
    'Choose a coast day'
  );
});
