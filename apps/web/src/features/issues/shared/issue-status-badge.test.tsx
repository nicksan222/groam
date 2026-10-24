import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { IssueStatus } from '@/types/issues';
import { IssueStatusBadge } from './issue-status-badge';

describe('IssueStatusBadge', () => {
  test.each<[IssueStatus, string]>([
    ['open', 'To decide'],
    ['in_progress', 'In progress'],
    ['closed', 'Done'],
    ['wont_do', "Won't do"]
  ])('shows %s as %s', async (status, label) => {
    await render(<IssueStatusBadge status={status} testId="status-chip" />);
    const badge = page.getByTestId('status-chip');
    await expect.element(badge).toHaveTextContent(label);
    await expect.element(badge).toHaveAttribute('data-status', status);
  });

  test('renders without a test id', async () => {
    await render(<IssueStatusBadge status="open" />);
    await expect.element(page.getByText('To decide')).toBeVisible();
  });
});
