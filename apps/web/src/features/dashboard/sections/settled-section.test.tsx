import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import { SettledSection } from './settled-section';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal);
});

function makeProposal(overrides: Record<string, unknown> = {}): WorkspaceTripProposal {
  return {
    author: { name: 'Lea', userId: 'user-1' },
    id: 'p1',
    reviewRequested: false,
    sourceTripId: 'trip-1',
    sourceTripName: 'Lisbon',
    status: 'draft',
    title: 'Add a rainy-day option',
    updatedAt: Date.now() - 2 * 86_400_000,
    ...overrides
  } as unknown as WorkspaceTripProposal;
}

describe('SettledSection', () => {
  test('shows the heading and an entry per settled idea', async () => {
    await render(
      <SettledSection
        items={[
          makeProposal({ id: 'p1', status: 'merged', title: 'Add Porto' }),
          makeProposal({ id: 'p2', status: 'closed', title: 'Skip the museum' })
        ]}
      />
    );
    await expect.element(page.getByRole('heading', { name: 'Recently decided' })).toBeVisible();
    await expect.element(page.getByRole('link', { name: /Add Porto/u })).toBeVisible();
    await expect.element(page.getByRole('link', { name: /Skip the museum/u })).toBeVisible();
    expect(page.getByRole('link').elements().length).toBe(2);
  });

  test.each([
    ['merged', /Applied|Merged|Decided/u],
    ['closed', /Closed/u]
  ] as const)('labels a %s idea with its status, trip and date', async (status, label) => {
    await render(<SettledSection items={[makeProposal({ status })]} />);
    await expect.element(page.getByText(label)).toBeVisible();
    await expect.element(page.getByText(/Lisbon/u)).toBeVisible();
    await expect.element(page.getByText(/2 days ago/u)).toBeVisible();
  });

  test('links to the idea', async () => {
    await render(<SettledSection items={[makeProposal({ status: 'merged' })]} />);
    await expect
      .element(page.getByRole('link'))
      .toHaveAttribute('href', expect.stringContaining('/trips/trip-1/ideas/p1/'));
  });
});
