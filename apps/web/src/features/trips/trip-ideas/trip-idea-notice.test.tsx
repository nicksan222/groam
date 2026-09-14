import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { TripIdeaNotice } from '@/features/trips/trip-ideas/trip-idea-notice';

vi.mock('@/features/ideas/hooks/use-idea-context', () => ({
  useOptionalIdeaContext: () => ({
    isViewerAuthor: false,
    proposal: { author: { name: 'Alex Morgan', userId: 'user-alex' } }
  })
}));

afterEach(cleanup);

test('shows a hint when viewing someone else’s idea', () => {
  render(<TripIdeaNotice />);
  expect(screen.getByText('Someone else’s idea')).toBeTruthy();
  expect(screen.getByText(/Alex Morgan/u)).toBeTruthy();
});
