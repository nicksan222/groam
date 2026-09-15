import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { IdeaCloneNav } from './idea-clone-nav';

afterEach(cleanup);

test('keeps edit tabs apart from the review tab', () => {
  const onOpen = vi.fn();
  render(<IdeaCloneNav changeCount={3} onOpen={onOpen} stopCount={2} view="itinerary" />);

  expect(screen.getByRole('navigation', { name: 'Idea plan' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Overview' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Itinerary (2)' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Changes (3)' })).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Changes (3)' }));
  expect(onOpen).toHaveBeenCalledWith('compare');
});

test.each(['overview', 'itinerary'] as const)('combines the read-only plan at %s', (view) => {
  render(<IdeaCloneNav changeCount={2} onOpen={vi.fn()} stopCount={3} view={view} viewOnly />);
  expect(screen.getByTestId('trip-section-overview').textContent).toBe('Plan');
  expect(screen.queryByTestId('trip-section-itinerary')).toBeNull();
  expect(screen.getByTestId('idea-section-compare')).toBeTruthy();
});
