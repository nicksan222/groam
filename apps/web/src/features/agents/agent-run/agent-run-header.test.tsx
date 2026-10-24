import { agentRunTime } from '@groam/ai/backend/runs/time';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { testIds } from '@/lib/test-ids';
import { AgentRunHeader } from './agent-run-header';
import { agentRunBack } from './agent-run-href';

vi.mock('@/lib/navigation/router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal);
});

const back = agentRunBack({
  discussionId: null,
  issueId: 'issue-1',
  proposalId: null,
  tripId: 'trip-1'
});

function makeRun(overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    agentId: 'issue',
    completedAt: null,
    createdBy: { name: 'Lea Ford', userId: 'user-1' },
    discussionId: null,
    error: null,
    headline: 'Started working',
    id: 'run-1',
    issueId: 'issue-1',
    kickoff: 'assign',
    proposalId: null,
    related: {
      chatTitle: null,
      ideaTitle: null,
      issueTitle: 'Rainy-day option',
      tripName: 'Lisbon'
    },
    report: null,
    shortId: 'runabc',
    startedAt: 1_700_000_000_000,
    status: 'running',
    surface: 'standalone',
    threadId: null,
    title: 'Rainy-day option',
    tripId: 'trip-1',
    updatedAt: 1_700_000_100_000,
    ...overrides
  } as unknown as AgentRun;
}

describe('AgentRunHeader surface label', () => {
  test.each([
    ['reviewer', 'standalone', 'Idea review'],
    ['reviewer', 'chat', 'Idea review'],
    ['researcher', 'standalone', 'Research'],
    ['groam', 'chat', 'Conversation'],
    ['issue', 'standalone', 'Issue resolution']
  ] as const)('%s on %s reads "%s"', async (agentId, surface, label) => {
    await render(
      <AgentRunHeader
        agent={{ id: 'issue', label: 'Issue agent' }}
        back={back}
        run={makeRun({ agentId, surface })}
      />
    );
    await expect.element(page.getByText(label)).toBeVisible();
  });
});

describe('AgentRunHeader', () => {
  test.each([390, 1280])(
    'keeps a long title on one line without overflowing at %ipx',
    async (width) => {
      await useViewport(width, 844);
      const title =
        'Review a flexible afternoon neighborhood walk and café stop for 30 travelers. '.repeat(4);
      await render(
        <AgentRunHeader
          agent={{ id: 'issue', label: 'Issue agent' }}
          back={back}
          run={makeRun({ title })}
        />
      );

      const heading = page.getByTestId(testIds.agentRunTitle).element();
      expect(heading.textContent).toBe(title);
      expect(heading.getAttribute('title')).toBe(title);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth
      );
    }
  );

  test('links back to where the run came from', async () => {
    await render(
      <AgentRunHeader agent={{ id: 'issue', label: 'Issue agent' }} back={back} run={makeRun()} />
    );
    await expect.element(page.getByRole('link', { name: 'Issues' })).toBeVisible();
  });

  test('shows the title with the run id, status, surface and starter', async () => {
    await render(
      <AgentRunHeader
        agent={{ id: 'issue', label: 'Issue agent' }}
        back={back}
        run={makeRun({ shortId: 'runxyz' })}
      />
    );
    await expect
      .element(page.getByTestId(testIds.agentRunTitle))
      .toHaveTextContent('Rainy-day option');
    await expect.element(page.getByText('#runxyz')).toBeInTheDocument();
    await expect.element(page.getByText('Lisbon')).toBeVisible();
    await expect.element(page.getByText('Running')).toBeVisible();
    await expect.element(page.getByText('Issue resolution')).toBeVisible();
    await expect.element(page.getByText('Started by Lea Ford')).toBeVisible();
  });

  test('prefers the short id over the id', async () => {
    await render(
      <AgentRunHeader
        agent={{ id: 'issue', label: 'Issue agent' }}
        back={back}
        run={makeRun({ shortId: 'R-7' })}
      />
    );
    await expect
      .element(page.getByTestId(testIds.agentRunTitle))
      .toHaveTextContent('Rainy-day option');
    await expect.element(page.getByText('#R-7')).toBeInTheDocument();
  });

  test('says queued by for queue kickoffs', async () => {
    await render(
      <AgentRunHeader
        agent={{ id: 'issue', label: 'Issue agent' }}
        back={back}
        run={makeRun({ kickoff: 'queue', status: 'queued' })}
      />
    );
    await expect.element(page.getByText(/queued by/iu)).toBeVisible();
    await expect.element(page.getByText('Queued', { exact: true })).toBeVisible();
  });

  test.each([
    ['its start time', 1_700_000_000_000, 1_700_000_100_000, 1_700_000_000_000],
    ['the last update when it never started', null, 1_700_000_100_000, 1_700_000_100_000]
  ] as const)('shows %s', async (_, startedAt, updatedAt, shown) => {
    await render(
      <AgentRunHeader
        agent={{ id: 'issue', label: 'Issue agent' }}
        back={back}
        run={makeRun({ startedAt, updatedAt })}
      />
    );
    await expect.element(page.getByText(agentRunTime(shown))).toBeVisible();
  });
});
