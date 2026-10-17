import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ResearchSummary } from '@/types/research';
import { LinkedResearchesSection } from './linked-researches-section';

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
      onOpen={vi.fn()}
    />
  );
  await expect.element(page.getByText('No research linked yet.')).toBeVisible();
  await page.getByRole('button', { name: 'New research' }).click();
  expect(onNew).toHaveBeenCalledOnce();
});

test('opens a linked research and links another', async () => {
  const linked = research('r1', 'Hotels');
  const other = research('r2', 'Museums');
  const onOpen = vi.fn();
  const onLink = vi.fn();
  await render(
    <LinkedResearchesSection
      available={[other]}
      linked={[linked]}
      onLink={onLink}
      onNew={vi.fn()}
      onOpen={onOpen}
    />
  );
  await page.getByRole('button', { name: 'Hotels' }).click();
  expect(onOpen).toHaveBeenCalledWith(linked);
  await page.getByRole('button', { name: 'Link research' }).click();
  await page.getByRole('button', { name: 'Museums' }).click();
  expect(onLink).toHaveBeenCalledWith(other);
});
