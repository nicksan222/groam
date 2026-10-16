import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripIdeaNotice } from '@/features/trips/trip-ideas/trip-idea-notice';

vi.mock('@/features/ideas/hooks/use-idea-context', () => ({
  useOptionalIdeaContext: () => ({
    isViewerAuthor: false,
    proposal: { author: { name: 'Alex Morgan', userId: 'user-alex' } }
  })
}));

test('shows a hint when viewing someone else’s idea', async () => {
  await render(<TripIdeaNotice />);
  await expect.element(page.getByText('Someone else’s idea')).toBeInTheDocument();
  await expect.element(page.getByText(/Alex Morgan/u)).toBeInTheDocument();
});
