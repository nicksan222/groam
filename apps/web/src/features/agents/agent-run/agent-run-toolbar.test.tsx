import { render } from '@groam/vitest-config/react';
import { expect, describe, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { testIds } from '@/lib/test-ids';
import { AgentRunToolbar } from './agent-run-toolbar';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal);
});

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('@groam/ui/components/toast', () => ({ toast }));

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
    shortId: null,
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

describe('AgentRunToolbar', () => {
  test.each([
    ['running', { stop: true, retryFromZero: false, rerun: false }],
    ['queued', { stop: true, retryFromZero: false, rerun: false }],
    ['failed', { stop: false, retryFromZero: true, rerun: false }],
    ['complete', { stop: false, retryFromZero: false, rerun: true }],
    ['aborted', { stop: false, retryFromZero: false, rerun: true }]
  ] as const)('a %s issue run offers the right actions', async (status, expected) => {
    await render(<AgentRunToolbar onRetry={vi.fn()} onStop={vi.fn()} run={makeRun({ status })} />);
    const has = (id: string) => page.getByTestId(id).elements().length > 0;
    expect(has(testIds.agentStop)).toBe(expected.stop);
    expect(has(testIds.agentRetryFromZero)).toBe(expected.retryFromZero);
    expect(has(testIds.agentRerun)).toBe(expected.rerun);
  });

  test('runs without an issue offer no retry or re-run', async () => {
    await render(
      <AgentRunToolbar onRetry={vi.fn()} run={makeRun({ issueId: null, status: 'failed' })} />
    );
    await expect.element(page.getByRole('button')).not.toBeInTheDocument();
  });

  test('hides Stop without an onStop handler', async () => {
    await render(<AgentRunToolbar onRetry={vi.fn()} run={makeRun({ status: 'running' })} />);
    await expect.element(page.getByTestId(testIds.agentStop)).not.toBeInTheDocument();
  });

  test('Stop calls onStop with the run id', async () => {
    const onStop = vi.fn();
    await render(<AgentRunToolbar onRetry={vi.fn()} onStop={onStop} run={makeRun()} />);
    await page.getByTestId(testIds.agentStop).click();
    expect(onStop).toHaveBeenCalledWith('run-1');
  });

  test('Stop shows progress and is disabled while stopping', async () => {
    let finish: () => void = () => undefined;
    const onStop = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    await render(<AgentRunToolbar onRetry={vi.fn()} onStop={onStop} run={makeRun()} />);
    const stop = page.getByTestId(testIds.agentStop);
    await stop.click();
    await expect.element(stop).toBeDisabled();
    await expect.element(stop).toHaveTextContent('Stopping…');
    finish();
    await expect.element(stop).toBeEnabled();
    await expect.element(stop).toHaveTextContent('Stop');
  });

  test('Stop reports a failure with a toast', async () => {
    const onStop = vi.fn(() => Promise.reject(new Error('Run already finished')));
    await render(<AgentRunToolbar onRetry={vi.fn()} onStop={onStop} run={makeRun()} />);
    await page.getByTestId(testIds.agentStop).click();
    await expect.poll(() => toast.error.mock.calls.length).toBe(1);
    expect(toast.error).toHaveBeenCalledWith('Run already finished');
    await expect.element(page.getByTestId(testIds.agentStop)).toBeEnabled();
  });

  test.each([
    ['failed', testIds.agentRetryFromZero],
    ['complete', testIds.agentRerun]
  ] as const)('a %s run retries with its id', async (status, testId) => {
    const onRetry = vi.fn();
    await render(<AgentRunToolbar onRetry={onRetry} run={makeRun({ status })} />);
    await page.getByTestId(testId).click();
    expect(onRetry).toHaveBeenCalledWith('run-1');
  });

  test('chat runs with a discussion link to the chat', async () => {
    await render(
      <AgentRunToolbar
        onRetry={vi.fn()}
        run={makeRun({
          discussionId: 'disc-1' as AgentRun['discussionId'],
          status: 'complete',
          surface: 'chat'
        })}
      />
    );
    await expect
      .element(page.getByRole('link', { name: 'Open chat' }))
      .toHaveAttribute('href', '/chat/disc-1');
  });

  test.each([
    ['a chat run without a discussion', { discussionId: null, surface: 'chat' as const }],
    [
      'a standalone run with a discussion',
      { discussionId: 'disc-1' as AgentRun['discussionId'], surface: 'standalone' as const }
    ]
  ])('%s has no chat link', async (_, overrides) => {
    await render(<AgentRunToolbar onRetry={vi.fn()} run={makeRun(overrides)} />);
    await expect.element(page.getByRole('link', { name: 'Open chat' })).not.toBeInTheDocument();
  });

  test('shows the AI settings link only for provider errors', async () => {
    await render(<AgentRunToolbar onRetry={vi.fn()} providerError run={makeRun()} />);
    await expect
      .element(page.getByRole('link', { name: 'AI settings' }))
      .toHaveAttribute('href', '/settings/ai');
  });

  test('has no AI settings link by default', async () => {
    await render(<AgentRunToolbar onRetry={vi.fn()} run={makeRun()} />);
    await expect.element(page.getByRole('link', { name: 'AI settings' })).not.toBeInTheDocument();
  });
});
