import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IdeaCloneLoadingShell } from './idea-clone-loading-shell';

test.each(['overview', 'compare'] as const)(
  'shows a labeled loading state for %s',
  async (view) => {
    await render(<IdeaCloneLoadingShell sharedTripId={'trip-1' as Id<'trips'>} view={view} />);
    await expect.element(page.getByRole('status', { name: 'Loading idea…' })).toBeVisible();
  }
);
