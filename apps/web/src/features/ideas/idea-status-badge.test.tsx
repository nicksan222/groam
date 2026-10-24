import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { IdeaStatus } from '@/types/ideas';
import { IdeaStatusBadge } from './idea-status-badge';

describe('IdeaStatusBadge', () => {
  test.each<[IdeaStatus, string]>([
    ['draft', 'Draft'],
    ['in_review', 'In review'],
    ['conflicted', 'Needs update'],
    ['merged', 'Applied'],
    ['closed', 'Closed']
  ])('labels %s as %s', async (status, label) => {
    await render(<IdeaStatusBadge status={status} />);
    await expect.element(page.getByText(label, { exact: true })).toBeVisible();
  });

  test.each<[number, string]>([
    [1, '1 conflict'],
    [3, '3 conflicts']
  ])('shows the conflict count for a conflicted idea (%i)', async (count, text) => {
    await render(<IdeaStatusBadge conflictCount={count} status="conflicted" />);
    await expect.element(page.getByText(text)).toBeVisible();
  });

  test.each<[IdeaStatus, number]>([
    ['conflicted', 0],
    ['draft', 2],
    ['in_review', 2]
  ])('hides the conflict count for %s with count %i', async (status, count) => {
    await render(<IdeaStatusBadge conflictCount={count} status={status} />);
    await expect.element(page.getByText(/conflict/u)).not.toBeInTheDocument();
  });
});
