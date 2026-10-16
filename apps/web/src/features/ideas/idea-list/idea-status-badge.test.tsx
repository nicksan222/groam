import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IdeaStatusBadge } from './idea-status-badge';

test('re-exports the shared idea status badge', async () => {
  await render(<IdeaStatusBadge conflictCount={2} status="conflicted" />);
  await expect.element(page.getByText('Needs update')).toBeVisible();
  await expect.element(page.getByText('2 conflicts')).toBeVisible();
});
