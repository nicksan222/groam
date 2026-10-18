import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { VersionBadge } from './version-badge';

describe('VersionBadge', () => {
  test.each([
    ['draft', 'Draft'],
    ['in_review', 'In review'],
    ['merged', 'Applied'],
    ['closed', 'Closed'],
    ['conflicted', 'Needs update']
  ] as const)('labels %s as %s', async (status, label) => {
    await render(<VersionBadge status={status} />);
    await expect.element(page.getByText(label, { exact: true })).toBeVisible();
  });

  test('shows a conflict count only when conflicted', async () => {
    await render(<VersionBadge conflictCount={2} status="conflicted" />);
    await expect.element(page.getByText('2 conflicts')).toBeVisible();
  });
});
