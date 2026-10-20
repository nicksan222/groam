import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ResearchSummary } from '@/types/research';
import { LinkedResearchesSection } from './linked-researches-section';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    params,
    to: _to,
    ...props
  }: {
    children?: ReactNode;
    params: { tripId: string; researchId: string };
    to: string;
    className?: string;
    'aria-label'?: string;
  }) => (
    <a {...props} href={`/trips/${params.tripId}/research/${params.researchId}`}>
      {children}
    </a>
  )
}));

const research = (id: string, title: string): ResearchSummary => ({
  brief: null,
  id,
  lastMessage: null,
  linkCount: 0,
  participantCount: 1,
  shortId: id,
  title,
  unread: false,
  updatedAt: 1
});

test('shows the empty state and fires New research', async () => {
  const onNew = vi.fn();
  await render(
    <LinkedResearchesSection
      available={[]}
      linked={[]}
      onLink={vi.fn()}
      onNew={onNew}
      tripId="t1"
    />
  );
  await expect.element(page.getByText('No research linked yet.')).toBeVisible();
  await page.getByRole('button', { name: 'New research' }).click();
  expect(onNew).toHaveBeenCalledOnce();
});

test('opens a linked research and links another', async () => {
  const linked = research('r1', 'Hotels');
  const other = research('r2', 'Museums');
  const onLink = vi.fn();
  await render(
    <LinkedResearchesSection
      available={[other]}
      linked={[linked]}
      onLink={onLink}
      onNew={vi.fn()}
      tripId="t1"
    />
  );
  expect(
    page.getByRole('link', { name: 'Open research: Hotels' }).element().getAttribute('href')
  ).toBe('/trips/t1/research/r1');
  await page.getByRole('button', { name: 'Link research' }).click();
  await page.getByRole('button', { name: 'Museums' }).click();
  expect(onLink).toHaveBeenCalledWith(other);
});

test('shows a brief and unread badge without using a stale chat preview', async () => {
  await render(
    <LinkedResearchesSection
      available={[]}
      linked={[
        {
          ...research('r1', 'Compare hotels near the station'),
          brief: 'Walking distance, accessible rooms, and a quiet neighborhood.',
          unread: true,
          lastMessage: { authorName: 'Groam', text: 'An old conversation message' }
        }
      ]}
      onLink={vi.fn()}
      onNew={vi.fn()}
      tripId="t1"
    />
  );
  await expect
    .element(page.getByText('Walking distance, accessible rooms, and a quiet neighborhood.'))
    .toBeVisible();
  await expect.element(page.getByText('New', { exact: true })).toBeVisible();
  await expect.element(page.getByText('An old conversation message')).not.toBeInTheDocument();
});
