import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { AgentRunIdea } from './agent-run-idea';

vi.mock('@/lib/navigation/router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal);
});

const ids = { proposalId: 'prop-1' as never, tripId: 'trip-1' as never };

describe('AgentRunIdea', () => {
  test('shows the idea title and links to the idea', async () => {
    await render(
      <ol>
        <AgentRunIdea ideaTitle="Add Porto" {...ids} />
      </ol>
    );
    await expect.element(page.getByTestId(testIds.agentRunIdea)).toBeVisible();
    await expect.element(page.getByText('Related idea')).toBeVisible();
    await expect.element(page.getByText('Add Porto')).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Open idea' }))
      .toHaveAttribute('href', expect.stringContaining('/trips/trip-1/ideas/prop-1/'));
  });

  test('falls back to "Untitled idea"', async () => {
    await render(
      <ol>
        <AgentRunIdea ideaTitle={null} {...ids} />
      </ol>
    );
    await expect.element(page.getByText('Untitled idea')).toBeVisible();
  });
});
