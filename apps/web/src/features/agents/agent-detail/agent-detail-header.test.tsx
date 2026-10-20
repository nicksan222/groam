import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { AgentDetailHeader, type AgentDetailAgent } from './agent-detail-header';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal);
});

function makeAgent(overrides: Partial<AgentDetailAgent> = {}): AgentDetailAgent {
  return {
    activeRunCount: 0,
    assignedIssueCount: 0,
    description: 'Works assigned issues',
    id: 'issue',
    label: 'Issue agent',
    lastActivityAt: null,
    status: 'idle',
    surface: 'standalone',
    ...overrides
  } as AgentDetailAgent;
}

describe('AgentDetailHeader', () => {
  test('shows a labeled loading state without agent details', async () => {
    await render(<AgentDetailHeader isLoading />);
    await expect.element(page.getByText('Loading agent…')).toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'All agents' })).toBeInTheDocument();
    await expect.element(page.getByText('Worker')).not.toBeInTheDocument();
    await expect.element(page.getByText('Chat', { exact: true })).not.toBeInTheDocument();
  });

  test('shows the label, description and a back link', async () => {
    await render(<AgentDetailHeader agent={makeAgent()} />);
    await expect
      .element(page.getByTestId(testIds.agentDetailTitle))
      .toHaveTextContent('Issue agent');
    await expect.element(page.getByText('Works assigned issues')).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'All agents' }))
      .toHaveAttribute('href', '/agents');
  });

  test.each([
    ['standalone', 'Worker'],
    ['chat', 'Chat']
  ] as const)('labels a %s agent as %s', async (surface, label) => {
    await render(<AgentDetailHeader agent={makeAgent({ surface })} />);
    await expect.element(page.getByText(label, { exact: true })).toBeVisible();
  });

  test.each([
    ['failed', 'Needs attention'],
    ['idle', 'Idle'],
    ['unknown', 'Activity incomplete'],
    ['working', 'Working']
  ] as const)('shows the %s status', async (status, label) => {
    await render(<AgentDetailHeader agent={makeAgent({ status })} />);
    await expect.element(page.getByText(label)).toBeVisible();
  });
});

test('explains how to continue when activity is incomplete', async () => {
  await render(
    <AgentDetailHeader
      agent={makeAgent({ status: 'unknown', runWindowIncomplete: true, activeRunCount: null })}
    />
  );
  await expect
    .element(page.getByText('Activity summary incomplete. Load more runs below to continue.'))
    .toBeVisible();
  await expect.element(page.getByText('Idle', { exact: true })).not.toBeInTheDocument();
});
